// controllers/baggageController.js
const pool = require('../db');

const saveBaggageCheck = async (req, res) => {
  try {
    const {
      kiosk_id,
      airline,
      origin,
      destination,
      weight,
      height,
      width,
      length,
      volume,
      status,
    } = req.body;

    // ✅ Validate required fields
    if (!airline || weight == null || !status) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // ✅ Fallback numeric fields to 0 if missing
    const h = height || 0;
    const w = width || 0;
    const l = length || 0;
    const v = volume || 0;

    // ✅ Insert into table, storing status as JSON
    const sql = `
      INSERT INTO baggage_checks 
      (kiosk_id, airline, flight_type, origin, destination, weight, height, width, length, volume, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const values = [
      kiosk_id || null,
      airline,
      null,
      origin || null,
      destination || null,
      weight,
      h,
      w,
      l,
      v,
      JSON.stringify(status), // store status as JSON
    ];

    await pool.execute(sql, values);

    res.status(201).json({ message: "✅ Baggage check saved successfully" });
  } catch (err) {
    console.error("❌ Error saving baggage check:", err);
    res.status(500).json({ message: "Failed to save baggage check", error: err.message });
  }
};

const getStats = async (req, res) => {
  try {
    const kiosk_id = req.query.kiosk_id;
    let where = '';
    const params = [];
    if (kiosk_id) {
      where = ' WHERE kiosk_id = ?';
      params.push(kiosk_id);
    }

    const [rows] = await pool.query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN status_weight = 'ok' AND status_volume = 'ok' THEN 1 ELSE 0 END) AS successful,
        SUM(CASE WHEN status_weight = 'over' THEN 1 ELSE 0 END) AS overweight,
        SUM(CASE WHEN status_volume = 'over' THEN 1 ELSE 0 END) AS oversize,
        SUM(CASE WHEN status_weight = 'over' OR status_volume = 'over' THEN 1 ELSE 0 END) AS failed
      FROM baggage_checks
      ${where}
    `, params);

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error fetching stats:", err.message);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
};

const getAllBaggageChecks = async (req, res) => {
  try {
    const kiosk_id = req.query.kiosk_id;
    if (kiosk_id) {
      const [rows] = await pool.query("SELECT * FROM baggage_checks WHERE kiosk_id = ? ORDER BY created_at DESC", [kiosk_id]);
      return res.json(rows);
    }
    const [rows] = await pool.query("SELECT * FROM baggage_checks ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching baggage checks:", err.message);
    res.status(500).json({ error: "Failed to fetch baggage checks" });
  }
};

module.exports = {
  saveBaggageCheck,
  getStats,
  getAllBaggageChecks,
 
};
