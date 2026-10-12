// routes/ads.js
const express = require('express');
const router = express.Router();
const adController = require('../controllers/adController');

// Get all ads (for admin panel with filtering)
router.get('/', adController.getAllAds);

// Get ads for specific kiosk (global + kiosk-specific)
router.get('/kiosk/:kioskId', adController.getAdsForKiosk);

// Check if ads have been updated for a specific kiosk
router.get('/kiosk/:kioskId/check', adController.checkAdUpdates);

// Listen to Real-Time SSE Stream for a Kiosk's ad changes
router.get('/kiosk/:kioskId/updates-stream', adController.adUpdatesStream);

// Get ads for sync with metadata
router.get('/sync/:kioskId', adController.getAdsForSync);

// Upload ad (global or kiosk-specific)
router.post('/upload', adController.uploadAd);

// Download ad for caching
router.get('/download/:id', adController.downloadAd);






// // Toggle ad active status
// router.patch('/:id/status', adController.toggleAdStatus);

// Delete ad
router.delete('/:id', adController.deleteAd);

module.exports = router;