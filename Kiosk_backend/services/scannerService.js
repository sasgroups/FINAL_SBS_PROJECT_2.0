// services/scannerService.js
const { SerialPort } = require("serialport");

const { getFlightDetails } = require("./flightInfoService.js");

let ioInstance = null;
let currentPort = null;
let reconnectTimer = null;
let isReconnecting = false;
let configuredPortName = null;
let configuredBaudRate = null;

function setScannerSocket(io) {
  ioInstance = io;
}

/**
 * Attempt to reconnect the scanner
 * @param {boolean} immediate - If true, reconnect immediately; otherwise schedule a retry.
 */
async function reconnectScanner(immediate = false) {
  if (isReconnecting) {
    console.log("Reconnection already in progress, skipping.");
    return;
  }

  if (!immediate) {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => reconnectScanner(true), 5000);
    return;
  }

  isReconnecting = true;
  console.log("🔄 Attempting to reconnect scanner...");

  try {
    if (currentPort && currentPort.isOpen) {
      await new Promise((resolve) => currentPort.close(resolve));
    }
    await setupScanner(configuredPortName, configuredBaudRate);
  } catch (err) {
    console.error("❌ Reconnection failed:", err.message);
    scheduleReconnect();
  } finally {
    isReconnecting = false;
  }
}

function scheduleReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => reconnectScanner(true), 5000);
}

async function setupScanner(portName = process.env.SCANNER_PORT, baudRate = 9600) {
  configuredPortName = portName;
  configuredBaudRate = baudRate;

  if (!portName) {
    console.error("❌ SCANNER_PORT is not defined in environment variables");
    return;
  }

  try {
    if (currentPort && currentPort.isOpen) {
      console.log("🔌 Closing existing scanner connection...");
      await new Promise((resolve) => currentPort.close(resolve));
    }

    const ports = await SerialPort.list();
    console.log("📡 Available Serial Ports:", ports.map((p) => p.path));

    const selectedPort = ports.find((p) => p.path === portName);
    if (!selectedPort) {
      console.error(`❌ Configured port ${portName} not found.`);
      scheduleReconnect();
      return;
    }

    const port = new SerialPort({
      path: selectedPort.path,
      baudRate,
      autoOpen: false, // We'll open it manually after attaching handlers
    });

    currentPort = port;

    // Buffer to accumulate incoming data
    let buffer = "";

    // Deduplication state
    let lastBarcode = "";
    let lastBarcodeTime = 0;

    port.on("open", () => {
      console.log(`✅ Barcode scanner connected on ${selectedPort.path}`);
      // Flush any stale data from the input buffer
      port.flush((err) => {
        if (err) console.error("Flush error:", err);
      });
      if (reconnectTimer) clearTimeout(reconnectTimer);
    });

    port.on("data", async (chunk) => {
      buffer += chunk.toString();

      // Split on any newline/carriage return
      const lines = buffer.split(/\r?\n/);
      // Keep the last (possibly incomplete) line in buffer
      buffer = lines.pop();

      for (const line of lines) {
        const barcode = line.trim();
        if (!barcode) continue; // Skip empty lines

        console.log("📦 Barcode scanned:", barcode);

        // Deduplicate: ignore identical barcodes received within 2 seconds
        const now = Date.now();
        if (barcode === lastBarcode && now - lastBarcodeTime < 2000) {
          console.log("Duplicate barcode ignored");
          continue;
        }
        lastBarcode = barcode;
        lastBarcodeTime = now;

        // Emit scan_start to frontend (optional)
        if (ioInstance) {
          ioInstance.emit("scan_start", { barcode });
        }

        // Parse and emit flight details
        try {
          const details = await getFlightDetails(barcode);
          console.log("✅ Flight details:", details);
          if (ioInstance) {
            ioInstance.emit("barcode_data", { barcode, details });
          }
        } catch (err) {
          console.error("❌ Failed to parse barcode:", err.message);
          if (ioInstance) {
            ioInstance.emit("barcode_data", { barcode, error: err.message });
          }
        }
      }
    });

    port.on("error", (err) => {
      console.error("❌ Scanner error:", err.message);
      scheduleReconnect();
    });

    port.on("close", () => {
      console.log("❌ Scanner disconnected");
      scheduleReconnect();
    });

    // Finally, open the port
    port.open();
  } catch (err) {
    console.error("❌ Failed to initialize scanner:", err.message);
    scheduleReconnect();
  }
}

module.exports = {
  setupScanner,
  setScannerSocket,
  reconnectScanner,
};