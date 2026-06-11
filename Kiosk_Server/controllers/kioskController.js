// controllers/kioskController.js
// controllers/kioskController.js
const bcrypt = require('bcrypt');
const db = require('../db');
const jwt = require('jsonwebtoken');
require('dotenv').config(); // add this line
const updateKioskBackend = require('../services/kioskLoginService');

// Create a kiosk
const createKiosk = async (req, res) => {
  try {
    const { name, location, conveyor_id, password, ip_address } = req.body; // ip_address from request
    const created_by = req.admin.id;

    if (!name || !password) {
      return res.status(400).json({ message: "Kiosk name and password are required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.execute(
      `INSERT INTO kiosks (name, location, conveyor_id, password, ip_address, created_by) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, location || null, conveyor_id || null, hashedPassword, ip_address || null, created_by]
    );

    res.status(201).json({ 
      message: 'Kiosk created', 
      kioskId: result.insertId,
      ip_address: ip_address || null
    });
  } catch (err) {
    console.error("❌ createKiosk error:", err);
    res.status(500).json({ message: 'Error creating kiosk' });
  }
};


const updateKiosk = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, conveyor_id, password, ip_address } = req.body;

    let query = "UPDATE kiosks SET name=?, location=?, conveyor_id=?, ip_address=?";
    const params = [name, location || null, conveyor_id || null, ip_address || null];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ", password=?";
      params.push(hashedPassword);
    }

    query += " WHERE id=?";
    params.push(id);

    await db.execute(query, params);
    res.json({ 
      message: "Kiosk updated",
      ip_address: ip_address || null
    });
  } catch (err) {
    console.error("❌ updateKiosk error:", err);
    res.status(500).json({ message: "Error updating kiosk" });
  }
};

const deleteKiosk = async (req, res) => {
  const { id } = req.params;
  let connection;

  try {
    connection = await db.getConnection();   // db is your pool
    await connection.beginTransaction();

    // Delete tokens first (foreign key constraint)
    await connection.execute('DELETE FROM kiosk_tokens WHERE kiosk_id = ?', [id]);

    // Then delete the kiosk
    const [result] = await connection.execute('DELETE FROM kiosks WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Kiosk not found' });
    }

    await connection.commit();
    res.json({ message: 'Kiosk and its tokens deleted successfully' });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('❌ deleteKiosk error:', err);
    res.status(500).json({ message: 'Failed to delete kiosk' });
  } finally {
    if (connection) connection.release();
  }
};
// List kiosks

const listKiosks = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, name, conveyor_id, ip_address, created_at 
       FROM kiosks 
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching kiosks' });
  }
};



const loginKiosk = async (req, res) => {
  const { kiosk_name, password } = req.body;

  if (!kiosk_name || !password) {
    return res.status(400).json({ message: "Kiosk name and password required" });
  }

  try {
    const [rows] = await db.execute('SELECT * FROM kiosks WHERE name = ?', [kiosk_name]);
    if (rows.length === 0) return res.status(401).json({ message: "Kiosk not found" });

    const kiosk = rows[0];
    const match = await bcrypt.compare(password, kiosk.password);
    if (!match) return res.status(401).json({ message: "Incorrect password" });
    const token = jwt.sign(
      { id: kiosk.id, name: kiosk.name },
      process.env.JWT_SECRET
    );

    await db.execute(
      'INSERT INTO kiosk_tokens (kiosk_id, token) VALUES (?, ?)',
      [kiosk.id, token]
    );

    res.json({
      token,
      kiosk_id: kiosk.id,
      kiosk_name: kiosk.name,
      kiosk_location: kiosk.location,
      conveyor_id: kiosk.conveyor_id,
      ip_address: kiosk.ip_address // Return the manually set IP from DB
    });
    
    // Update backend with the existing kiosk data (including manually set IP)
    await updateKioskBackend(kiosk);
  } catch (err) {
    console.error("❌ Kiosk login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



const getAllKiosks = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT id, name, ip_address,location FROM kiosks ORDER BY name ASC"
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching kiosks:", err.message);
    res.status(500).json({ message: "Failed to fetch kiosks" });
  }
};

module.exports = {
  createKiosk,
  updateKiosk,
  deleteKiosk,
  listKiosks,
  loginKiosk,
  getAllKiosks
};


