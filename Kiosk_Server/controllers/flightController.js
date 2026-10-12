const db = require('../db');
const flightModel = require('../models/flightModel');
const airportCountries = require('../utils/airportCountryMap');

// Get all flights
exports.getFlights = async (req, res) => {
  try {
    const flights = await flightModel.getAllFlights();
    res.json(flights);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching flights' });
  }
};

// Create a new flight
exports.createFlight = async (req, res) => {
  try {
    const {
      airline,
      flight_code,
      flight_number,
      max_weight,
      volume,
    } = req.body;

    const normalizeNumber = (value) => {
      if (value === undefined || value === null || value === "") return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const codeValue = flight_code || flight_number;
    const weightValue = normalizeNumber(max_weight);
    const volumeValue = normalizeNumber(volume);

    if (!airline || !codeValue || weightValue === null || volumeValue === null) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newFlight = {
      airline,
      flight_number: codeValue,
      max_weight: weightValue,
      max_volume: volumeValue,
    };

    await flightModel.createFlight(newFlight);
    res.status(201).json({ message: 'Flight created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating flight' });
  }
};



// Get a flight by flight number and return baggage info from DB
exports.getFlightByNumber = async (req, res) => {
  const { flightNumber } = req.params;

  try {
    const [rows] = await db.execute(
      'SELECT * FROM flights WHERE flight_number = ? LIMIT 1',
      [flightNumber]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Flight not found' });
    }

    const flight = rows[0];

    const baggageLimit = {
      maxWeight: flight.max_weight,
      maxVolume: flight.max_volume,
      maxDimension: flight.max_volume,
    };

    res.json({
      id: flight.id,
      passengerName: `${flight.first_name} ${flight.last_name}`,
      airline: flight.airline,
      flightNumber: flight.flight_number,
      source: flight.source,
      destination: flight.destination,
      flightType: flight.flight_type,
      createdAt: flight.created_at,
      baggageLimit,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a flight
exports.deleteFlight = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.execute('DELETE FROM flights WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Flight not found' });
    }
    res.json({ message: 'Flight deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting flight' });
  }
};

// Update flight by ID
exports.updateFlight = async (req, res) => {
  const { id } = req.params;
  const {
    airline,
    flight_code,
    flight_number,
    max_weight,
    volume,
  } = req.body;

  try {
    const normalizeNumber = (value) => {
      if (value === undefined || value === null || value === "") return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const codeValue = flight_code || flight_number;
    const weightValue = normalizeNumber(max_weight);
    const volumeValue = normalizeNumber(volume);

    const updateData = {};
    if (airline !== undefined) updateData.airline = airline;
    if (codeValue !== undefined) updateData.flight_number = codeValue;
    if (weightValue !== null) {
      updateData.max_weight = weightValue;
    }
    if (volumeValue !== null) {
      updateData.max_volume = volumeValue;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No valid update fields provided' });
    }

    const fields = Object.keys(updateData)
      .map(key => `${key} = ?`)
      .join(', ');
    const values = Object.values(updateData);

    const sql = `UPDATE flights SET ${fields} WHERE id = ?`;

    const [result] = await db.execute(sql, [...values, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Flight not found' });
    }

    res.json({ message: 'Flight updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating flight' });
  }
};

exports.getFlightsByAirline = async (req, res) => {
  const { airline } = req.params;
  try {
    const [flights] = await db.execute(
      `SELECT id, airline, flight_number AS flight_code,
              max_weight, max_volume,
              created_at
       FROM flights
       WHERE airline = ?`,
      [airline]
    );
    res.json(flights);
  } catch (error) {
    console.error('Error fetching flights by airline:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
