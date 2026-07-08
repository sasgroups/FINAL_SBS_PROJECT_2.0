// controllers/adminController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db'); // path to your pool

const registerAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Missing fields' });

    // check exists
    const [existing] = await db.execute('SELECT id FROM admins WHERE email = ?', [email]);
    if (existing.length) return res.status(400).json({ message: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    await db.execute('INSERT INTO admins (email, password) VALUES (?, ?)', [email, hash]);
    res.json({ message: 'Admin registered' });
  } catch (err) {
    console.error('registerAdmin error', err);
    res.status(500).json({ message: 'Server error' });
  }
};



loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Missing fields' });

    const [rows] = await db.execute('SELECT * FROM admins WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ message: 'Invalid email or password' });

    const admin = rows[0];
    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(401).json({ message: 'Invalid email or password' });

    // ✅ Add isAdmin: true to token payload
const token = jwt.sign(
  { id: admin.id, email: admin.email, isAdmin: true },
  process.env.JWT_SECRET || 'secret123',
  { expiresIn: '12h' }
);


    res.json({ token, admin: { id: admin.id, email: admin.email } });
  } catch (err) {
    console.error('loginAdmin error', err);
    res.status(500).json({ message: 'Server error' });
  }
};


module.exports = { registerAdmin, loginAdmin };
