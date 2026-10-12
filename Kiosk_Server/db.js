// const mysql = require('mysql2/promise'); // ✅ use the promise wrapper

// const pool = mysql.createPool({
//   host: 'localhost',
//   user: 'root',
//   password: 'Weighlog@2025',
//   database:cd  'kiosk_ads',
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0
// });

// module.exports = pool;

const mysql = require('mysql2/promise'); // ✅ use the promise wrapper

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Sasgroups@2012',
  database: 'kiosk_ads',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;