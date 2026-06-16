const db = require('../db'); // this should export mysql2/promise pool

exports.getAllFlights = async () => {
  try {
    const [rows] = await db.execute(
      `SELECT id, airline, flight_number AS flight_code,
              max_weight_domestic, max_volume_domestic,
              max_weight_international, max_volume_international,
              created_at
       FROM flights
       ORDER BY created_at DESC`
    );
    return rows;
  } catch (err) {
    throw err;
  }
};

exports.createFlight = async (flightData) => {
  const query = `
    INSERT INTO flights
    (airline, flight_number,
     max_weight_domestic, max_volume_domestic,
     max_weight_international, max_volume_international)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  const normalizeNumber = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const maxWeight = normalizeNumber(flightData.max_weight ?? flightData.max_weight_domestic ?? flightData.max_weight_international);
  const maxDimension = normalizeNumber(flightData.dimension ?? flightData.max_volume_domestic ?? flightData.max_volume_international);

  const values = [
    flightData.airline,
    flightData.flight_number,
    maxWeight,
    maxDimension,
    maxWeight,
    maxDimension
  ];

  try {
    const [result] = await db.execute(query, values);
    return result;
  } catch (err) {
    throw err;
  }
};


