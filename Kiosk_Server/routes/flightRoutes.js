// backend/routes/flightRoutes.js
const express = require('express');
const router = express.Router();
const flightController = require('../controllers/flightController');




// Existing routes
router.get('/', flightController.getFlights);
router.post('/', flightController.createFlight);
router.get('/airline/:airline', flightController.getFlightsByAirline); // Flights by airline
router.get('/:flightNumber', flightController.getFlightByNumber);

// New routes
router.put('/:id', flightController.updateFlight);          // Update flight by ID
router.delete('/:id', flightController.deleteFlight);        // Delete flight by ID

module.exports = router;
