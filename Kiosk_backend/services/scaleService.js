const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

let currentWeight = 0;
let scaleStatus = "Offline";
let kioskId = null;
let portInstance = null;
let lastReceivedTime = Date.now();
let monitorInterval = null;
let io = null;

let comPort = null;
let baudRate = 9600;
let reconnectInterval = null;

// ---------------- Socket.IO setup ----------------
const setSocketInstance = (ioInstance) => {
  io = ioInstance;

  io.on('connection', (socket) => {
    console.log('Frontend connected to Socket.IO');

    socket.on('register_kiosk', (data) => {
      kioskId = data.kiosk_id;
      console.log(`Registered Kiosk ID: ${kioskId}`);
      emitStatus(); // Send current status immediately
    });
  });
};

// ---------------- Emit status ----------------
const emitStatus = () => {
  if (io && kioskId) {
    io.emit('scale_status', { kiosk_id: kioskId, status: scaleStatus });
    io.emit('weight_update', { kiosk_id: kioskId, weight: currentWeight, status: scaleStatus });
  }
};

// ---------------- Monitor Status ----------------
const startMonitor = () => {
  if (monitorInterval) clearInterval(monitorInterval);

  monitorInterval = setInterval(() => {
    const now = Date.now();
    if (now - lastReceivedTime > 5000 && scaleStatus === "Online") {
      scaleStatus = "Offline";
      currentWeight = 0;
      console.log(`Kiosk ${kioskId || 'Unknown'}: No data for 5s → Scale Offline`);
      emitStatus();
    }
  }, 2000);
};

// ---------------- Setup Serial Port ----------------
const setupScaleReader = async (port, rate = 9600) => {
  comPort = port;
  baudRate = rate;

  try {
    const ports = await SerialPort.list();
    console.log('Available Ports:', ports.map(p => p.path));

    const selected = ports.find(p => p.path === comPort);
    if (!selected) {
      console.warn(`Port ${comPort} not found.`);
      return;
    }

    openPort();
  } catch (err) {
    console.error('Error initializing scale reader:', err.message);
  }
};

// ---------------- Open Port ----------------
const openPort = () => {
  if (portInstance && portInstance.isOpen) {
    portInstance.close();
  }

  portInstance = new SerialPort({ path: comPort, baudRate: parseInt(baudRate), autoOpen: false });

  portInstance.open((err) => {
    if (err) {
      console.error('Failed to open port:', err.message);
      scheduleReconnect();
      scaleStatus = "Error";
      currentWeight = 0;
      emitStatus();
      return;
    }

    console.log(`Port ${comPort} opened`);
    scaleStatus = "Offline"; // Wait for first valid data
    lastReceivedTime = Date.now();
    emitStatus();
    startMonitor();
  });

  const parser = portInstance.pipe(new ReadlineParser({ delimiter: '\r\n' }));

  parser.on('data', (line) => {
    try {
      const parts = line.trim().split(/\s+/);
      const weight = parseFloat(parts[1]); // Adjust index for your scale

      if (!isNaN(weight)) {
        currentWeight = weight;
        lastReceivedTime = Date.now();

        if (scaleStatus !== "Online") {
          scaleStatus = "Online";
          console.log(`Kiosk ${kioskId || 'Unknown'}: Scale Online`);
        }

        emitStatus();
      } else {
        console.warn(`Failed to parse weight: ${line}`);
      }
    } catch (e) {
      console.warn(`Error parsing line: ${line}`, e.message);
    }
  });

  portInstance.on('error', (err) => {
    console.error('Serial port error:', err.message);
    scaleStatus = "Error";
    currentWeight = 0;
    emitStatus();
    scheduleReconnect();
  });

  portInstance.on('close', () => {
    console.log(`Port ${comPort} closed`);
    scaleStatus = "Offline";
    currentWeight = 0;
    emitStatus();
    scheduleReconnect();
  });
};

// ---------------- Reconnect ----------------
const scheduleReconnect = () => {
  if (reconnectInterval) return; // already scheduled

  reconnectInterval = setInterval(async () => {
    console.log(`Attempting to reconnect port ${comPort}...`);
    try {
      const ports = await SerialPort.list();
      if (ports.find(p => p.path === comPort)) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
        openPort();
      }
    } catch (err) {
      console.error('Reconnect attempt failed:', err.message);
    }
  }, 5000); // try every 5s
};

// ---------------- Exports ----------------
const getCurrentWeight = () => currentWeight;
const getScaleStatus = () => scaleStatus;

module.exports = {
  setupScaleReader,
  getCurrentWeight,
  getScaleStatus,
  setSocketInstance,
};
