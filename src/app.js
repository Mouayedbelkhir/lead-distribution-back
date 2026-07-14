const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const clientRoutes = require("./routes/client.routes");
const deliveryRoutes = require("./routes/delivery.routes");
const leadRoutes = require("./routes/lead.routes");
const verticalRoutes = require("./routes/vertical.routes");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/clients", clientRoutes);
app.use("/api/v1/deliveries", deliveryRoutes);
app.use("/api/v1/leads", leadRoutes);
app.use("/api/v1/verticals", verticalRoutes);

// Health Check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "lead-distribution-api",
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message,
  });
});

module.exports = app;