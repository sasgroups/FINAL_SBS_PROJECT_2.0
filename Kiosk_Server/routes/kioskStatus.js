// routes/kioskStatus.js
module.exports = (kiosks, io) => {
  const express = require("express");
  const router = express.Router();

  const ACTIVE_TIMEOUT = 5000; // 5 seconds to consider kiosk active
  const CLEANUP_INTERVAL = 2000; // interval to remove stale kiosks

  // ---------------- POST /update ----------------
  router.post("/update", (req, res) => {
    const apiKey = req.headers["x-api-key"];
    const validKey = process.env.API_KEY || "YOUR_SECRET_KEY";
    if (apiKey !== validKey) {
      return res.status(403).json({ error: "Invalid API key" });
    }

    const { kioskId, ...data } = req.body;
    if (!kioskId) return res.status(400).json({ error: "Missing kioskId" });

    const updated = {
      kioskId,
      ...data,
      lastUpdated: Date.now(),
    };

    kiosks.set(kioskId, updated);

      console.log(`📡 Kiosk update received from ${kioskId}:`, updated);

    // Emit only currently active kiosks
    emitActiveKiosks();

    res.json({ success: true });
  });

  // ---------------- GET /all ----------------
  router.get("/all", (req, res) => {
    res.json(getActiveKiosks());
  });

  // ---------------- Helper: get active kiosks ----------------
  const getActiveKiosks = () => {
    const now = Date.now();
    return Object.fromEntries(
      Array.from(kiosks).filter(([_, kData]) => now - kData.lastUpdated <= ACTIVE_TIMEOUT)
    );
  };

  // ---------------- Helper: emit active kiosks ----------------
  const emitActiveKiosks = () => {
    io.emit("update_dashboard", getActiveKiosks());
  };

  // ---------------- Cleanup interval ----------------
  setInterval(() => {
    const now = Date.now();
    let changed = false;

    for (const [id, kData] of kiosks) {
      if (now - kData.lastUpdated > ACTIVE_TIMEOUT) {
        kiosks.delete(id);
        changed = true;
        console.log(`⚠️ Kiosk ${id} removed due to inactivity`);
      }
    }

    if (changed) emitActiveKiosks();
  }, CLEANUP_INTERVAL);

  return router;
};
