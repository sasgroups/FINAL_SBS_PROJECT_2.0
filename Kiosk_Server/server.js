require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const fileUpload = require('express-fileupload');
const path = require('path');
const { Server } = require("socket.io");
const kioskStatus = require("./routes/kioskStatus");
const configRoutes = require('./routes/configRoutes');
const serialPortsRoute = require('./routes/serialPorts');
const adRoutes = require('./routes/ads');
const adminRoutes = require('./routes/admin');
const flightRoutes = require('./routes/flightRoutes');
const baggageRoutes = require("./routes/baggageRoutes");
const kioskRoutes = require("./routes/kioskRoutes");
const pageTimeoutRoutes = require('./routes/pageTimeoutRoutes');
const fs = require('fs');  


const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(fileUpload());
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Share Socket.IO instance with Express app routes
app.set("io", io);

// In-memory data store for kiosk statuses
const kiosks = new Map();

io.on("connection", (socket) => {
  console.log("🟢 Dashboard client connected via Socket.IO");
  socket.emit("update_dashboard", Object.fromEntries(kiosks));

  socket.on("disconnect", () => {
    console.log("🔴 Dashboard client disconnected");
  });
});

// Routes
app.use("/api/kiosks", kioskStatus(kiosks, io));
app.use('/api/ads', adRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/flights', flightRoutes);
app.use('/api', configRoutes);
app.use('/api/serial-ports', serialPortsRoute);
app.use('/api/page-timeouts', pageTimeoutRoutes);
app.use("/api/baggage", baggageRoutes);
app.use('/api/kiosks', kioskRoutes)
// Default route
app.get("/", (req, res) => {
  res.send("✅ Central Server is running.");
});


const PORT = process.env.PORT || 7000;
server.listen(PORT, () => {
  console.log(`🚀 Central Server running on port ${PORT}`);
});
