require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const path = require("path");
const { Server } = require("socket.io");
const fs = require("fs");

// Routes
const kioskStatus = require("./routes/kioskStatus");
const configRoutes = require("./routes/configRoutes");
const serialPortsRoute = require("./routes/serialPorts");
const adRoutes = require("./routes/ads");
const adminRoutes = require("./routes/admin");
const flightRoutes = require("./routes/flightRoutes");
const baggageRoutes = require("./routes/baggageRoutes");
const kioskRoutes = require("./routes/kioskRoutes");
const pageTimeoutRoutes = require("./routes/pageTimeoutRoutes");

const app = express();
const server = http.createServer(app);

// =====================================================
// CORS
// =====================================================

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:7000",

  // Add your deployed frontend here if required
  // "https://your-frontend.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow Postman, mobile apps, curl, etc.
      if (!origin) {
        return callback(null, true);
      }

      // Allow configured origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("❌ CORS blocked origin:", origin);
      return callback(new Error("Not allowed by CORS"));
    },

    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-auth-token",
    ],

    credentials: true,
  })
);

// Handle OPTIONS / preflight requests
app.options("*", cors());

// =====================================================
// BODY PARSERS
// =====================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================================================
// FILE UPLOAD
// =====================================================

app.use(fileUpload());

// =====================================================
// UPLOADS
// =====================================================

const uploadsDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use("/uploads", express.static(uploadsDir));

// =====================================================
// SOCKET.IO
// =====================================================

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

// =====================================================
// KIOSK STATUS STORE
// =====================================================

const kiosks = new Map();

io.on("connection", (socket) => {
  console.log("🟢 Dashboard client connected via Socket.IO");

  socket.emit(
    "update_dashboard",
    Object.fromEntries(kiosks)
  );

  socket.on("disconnect", () => {
    console.log("🔴 Dashboard client disconnected");
  });
});

// =====================================================
// ROUTES
// =====================================================

// Kiosk status routes
app.use(
  "/api/kiosks",
  kioskStatus(kiosks, io)
);

// Kiosk login / kiosk APIs
app.use(
  "/api/kiosks",
  kioskRoutes
);

// Other routes
app.use("/api/ads", adRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/flights", flightRoutes);

app.use("/api", configRoutes);

app.use(
  "/api/serial-ports",
  serialPortsRoute
);

app.use(
  "/api/page-timeouts",
  pageTimeoutRoutes
);

app.use(
  "/api/baggage",
  baggageRoutes
);

// =====================================================
// DEFAULT ROUTE
// =====================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Central Server is running.",
    port: PORT,
  });
});

// =====================================================
// 404 HANDLER
// =====================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
    path: req.originalUrl,
  });
});

// =====================================================
// ERROR HANDLER
// =====================================================

app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.message);

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "CORS blocked this origin",
      origin: req.headers.origin,
    });
  }

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// =====================================================
// START SERVER
// =====================================================

const PORT = process.env.PORT || 7000;

server.listen(PORT, () => {
  console.log(`🚀 Central Server running on port ${PORT}`);
});