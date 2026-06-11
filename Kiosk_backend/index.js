require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const fileUpload = require("express-fileupload");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

// Services
const { setupScaleReader, getCurrentWeight, setSocketInstance, getScaleStatus } = require("./services/scaleService");
const { setupScanner, setScannerSocket, reconnectScanner } = require("./services/scannerService");
const { getScannerStatus } = require("./services/scannerStatus");
const { getRealSenseStatus } = require("./services/realsenseService");
const configRoutes = require("./routes/configRoutes");

// ---- Stable status tracking (to avoid flapping) ----
// Each component stores: { currentStable, consecutiveCount, lastRaw }
const stableStatus = {
  scale: { currentStable: "Unknown", consecutiveCount: 0, lastRaw: null },
  scanner: { currentStable: "Unknown", consecutiveCount: 0, lastRaw: null },
  realsense: { currentStable: "Unknown", consecutiveCount: 0, lastRaw: null }
};

// Required consecutive identical readings before updating stable status
const REQUIRED_CONSECUTIVE = 1;

function updateStableStatus(component, rawStatus) {
  const comp = stableStatus[component];
  if (!comp) return rawStatus; // fallback

  // Normalize raw status to a simple string (Online / Offline / Unknown)
  let normalized = "Unknown";
  if (rawStatus && typeof rawStatus === "string") {
    const lower = rawStatus.toLowerCase();
    if (lower.includes("online")) normalized = "Online";
    else if (lower.includes("offline")) normalized = "Offline";
  }

  if (comp.lastRaw === normalized) {
    comp.consecutiveCount++;
  } else {
    comp.consecutiveCount = 1;
    comp.lastRaw = normalized;
  }

  if (comp.consecutiveCount >= REQUIRED_CONSECUTIVE && comp.currentStable !== normalized) {
    console.log(`🟢 ${component} status changed to ${normalized} (stable after ${REQUIRED_CONSECUTIVE} polls)`);
    comp.currentStable = normalized;
  }
  return comp.currentStable;
}

// ---- Load kiosk config ----
let kioskConfig = {};
try {
  const data = fs.readFileSync(path.join(__dirname, "kioskConfig.json"));
  kioskConfig = JSON.parse(data);
} catch (err) {
  console.error("❌ Failed to load kiosk config:", err.message);
}

setupScaleReader(process.env.SCALE_PORT, 9600);

// ---- App setup ----
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload());
app.use("/api", configRoutes);
// Socket.IO
setSocketInstance(io);
setScannerSocket(io);

io.on("connection", (socket) => {
  console.log("🟢 Client connected to Socket.IO");
  socket.on("disconnect", () => console.log("🔴 Client disconnected"));
});

// Scanner initialization
try {
  setupScanner(process.env.SCANNER_PORT, 9600);
} catch (err) {
  console.error("❌ Scanner initialization failed:", err.message);
}

// ==========================================================
// API ENDPOINTS
// ==========================================================
app.get("/api/weight", (req, res) => res.json({ weight: getCurrentWeight() }));
app.get("/api/weight/status", (req, res) => {
  const rawStatus = getScaleStatus();
  const stable = updateStableStatus("scale", rawStatus);
  res.json({ status: stable });
});

app.get("/api/scanner-status", async (req, res) => {
  const raw = await getScannerStatus(process.env.SCANNER_PORT);
  const status = raw.status || "Unknown";
  const stable = updateStableStatus("scanner", status);
  res.json({ ...raw, status: stable });
});

app.get("/api/realsense-status", async (req, res) => {
  const raw = await getRealSenseStatus();
  const status = raw.status || "Unknown";
  const stable = updateStableStatus("realsense", status);
  res.json({ ...raw, status: stable });
});

// Manual scanner reconnection
app.post("/api/scanner/reconnect", async (req, res) => {
  try {
    await reconnectScanner(true);
    res.json({ success: true, message: "Scanner reconnection triggered" });
  } catch (err) {
    console.error("Manual reconnection error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================================
// AUTO SEND KIOSK STATUS TO CENTRAL (with stable values)
// ==========================================================
const API_BASE_CENTRAL = process.env.API_URL;
const API_BASE_KIOSK = process.env.API_BASE_KIOSK;
const API_KEY = process.env.API_KEY;

async function sendKioskStatus() {
  // Reload config fresh each time (only read, never write here)
  let kioskConfig = {};
  try {
    const configPath = path.join(process.cwd(), "kioskConfig.json");
    const data = fs.readFileSync(configPath);
    kioskConfig = JSON.parse(data);
  } catch (err) {
    console.error("❌ Failed to load kiosk config:", err.message);
    return;
  }
  if (!kioskConfig.kioskId) return;

  try {
    const [weightRes, scaleStatusRes, scannerStatusRes, realsenseStatusRes] = await Promise.all([
      axios.get(`${API_BASE_KIOSK}/api/weight`),
      axios.get(`${API_BASE_KIOSK}/api/weight/status`),
      axios.get(`${API_BASE_KIOSK}/api/scanner-status`),
      axios.get(`${API_BASE_KIOSK}/api/realsense-status`)
    ]);

    const kioskData = {
      kioskId: kioskConfig.kioskId,
      kiosk_name: kioskConfig.kioskName,
      kiosk_location: kioskConfig.kioskLocation,
      weight: weightRes.data.weight,
      scaleStatus: scaleStatusRes.data.status,
      scannerStatus: scannerStatusRes.data.status,
      realsenseStatus: realsenseStatusRes.data.status,
      timestamp: new Date().toISOString()
    };

    await axios.post(`${API_BASE_CENTRAL}/api/kiosks/update`, kioskData, {
      headers: { "x-api-key": API_KEY, "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("❌ Error sending kiosk status:", err.response?.data || err.message);
  }
}

// ==========================================================
// START SERVER
// ==========================================================
server.listen(process.env.PORT, "0.0.0.0", () => {
  console.log(`🚀 Kiosk Backend running on port ${process.env.PORT}`);
  setTimeout(sendKioskStatus, 8000);
  setInterval(sendKioskStatus, 5000);
});