// controllers/adController.js
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../db');

// Keep track of connected SSE clients specifically for instantaneous ad pushes
const sseClients = new Set();

// ✅ Get ads for specific kiosk (global + kiosk-specific)
exports.getAdsForKiosk = async (req, res) => {
  try {
    const { kioskId } = req.params;
    const { include_metadata = 'false' } = req.query;
    
    if (!kioskId) {
      return res.status(400).json({ error: 'Kiosk ID is required' });
    }

    // Get global ads AND ads for this specific kiosk
    const [ads] = await db.execute(`
      SELECT 
        a.*,
        CASE 
          WHEN a.kiosk_id IS NULL THEN 'global'
          ELSE 'kiosk-specific'
        END as ad_type
      FROM ads a
      WHERE (a.kiosk_id IS NULL OR a.kiosk_id = ?)
      ORDER BY 
        a.kiosk_id DESC, -- Show kiosk-specific ads first
        a.created_at DESC
    `, [kioskId]);

    if (include_metadata === 'true') {
      // Add file metadata using writable external directory
      const adsWithMetadata = await Promise.all(
        ads.map(async (ad) => {
          // FIXED: Use process.cwd() instead of __dirname
          const filePath = path.join(process.cwd(), 'uploads', ad.filename);
          try {
            const stats = fs.statSync(filePath);
            const fileBuffer = fs.readFileSync(filePath);
            const hash = crypto.createHash('md5').update(fileBuffer).digest('hex');
            
            return {
              ...ad,
              file_hash: hash,
              file_size: stats.size,
              last_modified: stats.mtime.toISOString(),
              url: `${req.protocol}://${req.get('host')}/uploads/${ad.filename}`,
              download_url: `${req.protocol}://${req.get('host')}/api/ads/download/${ad.id}`
            };
          } catch (err) {
            console.error(`Error reading file ${ad.filename}:`, err);
            return { ...ad, file_hash: null };
          }
        })
      );
      
      // Filter out ads with missing files
      const validAds = adsWithMetadata.filter(ad => ad.file_hash !== null);
      
      res.json({
        success: true,
        kiosk_id: kioskId,
        ads: validAds,
        count: validAds.length,
        timestamp: new Date().toISOString()
      });
    } else {
      res.json({
        success: true,
        kiosk_id: kioskId,
        ads: ads,
        count: ads.length
      });
    }
  } catch (err) {
    console.error('Error fetching kiosk ads:', err);
    res.status(500).json({ error: 'Error fetching advertisements' });
  }
};

// ✅ Check if ad updates exist for a kiosk (lightweight polling)
exports.checkAdUpdates = async (req, res) => {
  try {
    const { kioskId } = req.params;
    
    if (!kioskId) {
      return res.status(400).json({ error: 'Kiosk ID is required' });
    }

    const [result] = await db.execute(`
      SELECT 
        COUNT(*) as count, 
        MAX(id) as max_id
      FROM ads a
      WHERE (a.kiosk_id IS NULL OR a.kiosk_id = ?)
    `, [kioskId]);

    const info = result[0] || { count: 0, max_id: 0 };
    
    res.json({
      success: true,
      count: info.count || 0,
      max_id: info.max_id || 0
    });
  } catch (err) {
    console.error('Error checking ad updates:', err);
    res.status(500).json({ error: 'Error checking updates' });
  }
};

// ✅ Server-Sent Events (SSE) for Real-Time Ad Updates without polling
exports.adUpdatesStream = (req, res) => {
  const { kioskId } = req.params;
  
  // Standard SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  
  // Send initial acknowledge heartbeat
  res.write(`data: ${JSON.stringify({ event: 'connected', kioskId })}\n\n`);
  
  const client = { id: Date.now() + Math.random(), kioskId, res };
  sseClients.add(client);
  
  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    if (client.res.writable) {
      client.res.write(`:\n\n`);
    } else {
      clearInterval(heartbeat);
    }
  }, 30000);
  
  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(client);
  });
};

// ✅ Get ads for sync (background synchronization)
exports.getAdsForSync = async (req, res) => {
  try {
    const { kioskId } = req.params;
    const { last_sync } = req.query;
    
    if (!kioskId) {
      return res.status(400).json({ error: 'Kiosk ID is required' });
    }

    // Get ads for this kiosk
    const [ads] = await db.execute(`
      SELECT a.* FROM ads a
      WHERE (a.kiosk_id IS NULL OR a.kiosk_id = ?)
    `, [kioskId]);

    // Generate sync data
    const syncData = {
      kiosk_id: parseInt(kioskId),
      timestamp: new Date().toISOString(),
      ads: []
    };

    // Add file metadata and hash using writable external directory
    for (const ad of ads) {
      // FIXED: Use process.cwd() instead of __dirname
      const filePath = path.join(process.cwd(), 'uploads', ad.filename);
      try {
        const stats = fs.statSync(filePath);
        const fileBuffer = fs.readFileSync(filePath);
        const hash = crypto.createHash('md5').update(fileBuffer).digest('hex');
        
        // Check if ad was modified since last sync
        const shouldInclude = !last_sync || 
          new Date(stats.mtime) > new Date(last_sync) ||
          !ad.file_hash || 
          ad.file_hash !== hash;

        if (shouldInclude) {
          syncData.ads.push({
            id: ad.id,
            filename: ad.filename,
            type: ad.type,
            kiosk_id: ad.kiosk_id,
            file_hash: hash,
            file_size: stats.size,
            last_modified: stats.mtime.toISOString(),
            is_global: ad.kiosk_id === null
          });
        }
      } catch (err) {
        console.error(`Error processing ad ${ad.id}:`, err);
      }
    }

    res.json(syncData);
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: 'Sync failed' });
  }
};

// ✅ Upload ad (global or kiosk-specific)
exports.uploadAd = async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.files.file;
    const { kiosk_id } = req.body;
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type' });
    }

    const type = file.mimetype.startsWith('video') ? 'video' : 'image';
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const fileExtension = path.extname(file.name);
    const uniqueFilename = `${type}_${timestamp}_${randomString}${fileExtension}`;
    
    // ---- FIX: Use writable external directory ----
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const uploadPath = path.join(uploadsDir, uniqueFilename);
    
    // Ensure the directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    // ---------------------------------------------

    // Move the file
    await file.mv(uploadPath);

    // Generate file hash
    const fileBuffer = fs.readFileSync(uploadPath);
    const file_hash = crypto.createHash('md5').update(fileBuffer).digest('hex');
    const file_size = file.size;

    const parsedKioskId = kiosk_id && kiosk_id !== '' ? parseInt(kiosk_id) : null;

    // Prevent duplicate ads
    let duplicateQuery = 'SELECT id FROM ads WHERE file_hash = ? AND ';
    let dupParams = [file_hash];
    
    if (parsedKioskId === null) {
      duplicateQuery += 'kiosk_id IS NULL';
    } else {
      duplicateQuery += 'kiosk_id = ?';
      dupParams.push(parsedKioskId);
    }
    
    const [duplicate] = await db.execute(duplicateQuery, dupParams);
    
    if (duplicate.length > 0) {
      fs.unlinkSync(uploadPath);
      return res.status(409).json({ error: 'ALREADY AD EXISTS: This specific advertisement media is already uploaded for this target.' });
    }

    if (parsedKioskId) {
      const [kiosk] = await db.execute('SELECT id FROM kiosks WHERE id = ?', [parsedKioskId]);
      if (kiosk.length === 0) {
        fs.unlinkSync(uploadPath);
        return res.status(404).json({ error: 'Kiosk not found' });
      }
    }

    const [result] = await db.execute(
      `INSERT INTO ads 
       (filename, type, kiosk_id, file_hash, file_size) 
       VALUES (?, ?, ?, ?, ?)`,
      [uniqueFilename, type, parsedKioskId, file_hash, file_size]
    );

    // Notify SSE clients
    sseClients.forEach(client => {
        if (!parsedKioskId || client.kioskId === String(parsedKioskId)) {
            client.res.write(`data: ${JSON.stringify({ event: 'ads_updated' })}\n\n`);
        }
    });

    res.json({
      success: true,
      message: parsedKioskId ? 'Kiosk-specific ad uploaded' : 'Global ad uploaded',
      ad: {
        id: result.insertId,
        filename: uniqueFilename,
        type: type,
        kiosk_id: parsedKioskId,
        is_global: parsedKioskId === null,
        file_hash: file_hash,
        file_size: file_size,
        url: `${req.protocol}://${req.get('host')}/uploads/${uniqueFilename}`
      }
    });

  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Error uploading file' });
  }
};

// ✅ Download ad for caching
exports.downloadAd = async (req, res) => {
  try {
    const { id } = req.params;
    const { kioskId } = req.query; // Verify kiosk has permission

    const [rows] = await db.execute(
      `SELECT filename, kiosk_id FROM ads WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    const ad = rows[0];
    
    // Check if ad is accessible to this kiosk
    if (ad.kiosk_id && ad.kiosk_id !== parseInt(kioskId)) {
      return res.status(403).json({ error: 'Ad not accessible to this kiosk' });
    }

    // FIXED: Use process.cwd() instead of __dirname
    const filePath = path.join(process.cwd(), 'uploads', ad.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(filePath, ad.filename);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Error downloading ad' });
  }
};

// ✅ Get all ads for admin panel
exports.getAllAds = async (req, res) => {
  try {
    const { kiosk_id, type } = req.query;
    
    let query = `
      SELECT 
        a.*,
        k.name as kiosk_name,
        k.location,
        CASE 
          WHEN a.kiosk_id IS NULL THEN 'Global'
          ELSE 'Kiosk-specific'
        END as scope
      FROM ads a
      LEFT JOIN kiosks k ON a.kiosk_id = k.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (kiosk_id) {
      query += ' AND (a.kiosk_id = ? OR a.kiosk_id IS NULL)';
      params.push(kiosk_id);
    }
    
    if (type) {
      query += ' AND a.type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY a.kiosk_id, a.created_at DESC';
    
    const [ads] = await db.execute(query, params);
    
    // Add URLs
    const adsWithUrls = ads.map(ad => ({
      ...ad,
      url: `${req.protocol}://${req.get('host')}/uploads/${ad.filename}`,
      thumbnail_url: ad.type === 'video' 
        ? `${req.protocol}://${req.get('host')}/api/ads/thumbnail/${ad.id}`
        : `${req.protocol}://${req.get('host')}/uploads/${ad.filename}`
    }));
    
    res.json({
      success: true,
      ads: adsWithUrls,
      count: adsWithUrls.length
    });
  } catch (err) {
    console.error('Error fetching ads:', err);
    res.status(500).json({ error: 'Error fetching ads' });
  }
};

// ✅ Delete ad
exports.deleteAd = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get ad info before deleting
    const [ad] = await db.execute(
      'SELECT filename, kiosk_id FROM ads WHERE id = ?',
      [id]
    );
    
    if (ad.length === 0) {
      return res.status(404).json({ error: 'Ad not found' });
    }
    
    // Delete from database
    await db.execute('DELETE FROM ads WHERE id = ?', [id]);
    
    // Delete file from writable external directory
    // FIXED: Use process.cwd() instead of __dirname
    const filePath = path.join(process.cwd(), 'uploads', ad[0].filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Notify connected SSE clients directly without dependencies
    sseClients.forEach(client => {
      // If it's a global ad or matching kiosk, send the refresh command
      if (!ad[0].kiosk_id || client.kioskId === String(ad[0].kiosk_id)) {
          client.res.write(`data: ${JSON.stringify({ event: 'ads_updated' })}\n\n`);
      }
    });

    res.json({
      success: true,
      message: 'Ad deleted successfully',
      deleted_id: id
    });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Error deleting ad' });
  }
};