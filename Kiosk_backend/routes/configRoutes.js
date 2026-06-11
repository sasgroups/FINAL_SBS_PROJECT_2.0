// routes/configRoutes.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

// ✅ Use process.cwd() – writable folder where the executable runs
const configPath = path.join(process.cwd(), "kioskConfig.json");

// Helper function to ensure the directory exists (optional, since we write to cwd directly)
function ensureDirectoryExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

router.post("/update-config", (req, res) => {
  const { kioskId, kioskName, kioskLocation, assignedConveyor, ip_address } = req.body;

  if (!kioskId || !kioskName) {
    return res.status(400).json({ message: "Missing kioskId or kioskName" });
  }

  const newConfig = {
    kioskId,
    kioskName,
    kioskLocation,
    assignedConveyor: assignedConveyor || null,
    ip_address: ip_address || null,
    updatedAt: new Date().toISOString()
  };

  try {
    // Ensure the parent directory exists (though for cwd it already does)
    ensureDirectoryExists(configPath);
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
    res.json({ message: "✅ Config updated successfully", data: newConfig });
  } catch (err) {
    console.error("❌ Error writing config file:", err);
    res.status(500).json({ message: "Error updating config", error: err.message });
  }
});

router.get("/get-config", (req, res) => {
  try {
    if (!fs.existsSync(configPath)) {
      return res.status(404).json({ message: "Config file not found" });
    }
    const configData = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    res.json(configData);
  } catch (err) {
    console.error("❌ Error reading config file:", err);
    res.status(500).json({ message: "Error reading config", error: err.message });
  }
});

module.exports = router;