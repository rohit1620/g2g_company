const express = require("express");
const cors = require("cors");
require("dotenv").config();

const requireAuth = require("./middleware/requireAuth");
const authRoutes = require("./routes/auth");
const employeeRoutes = require("./routes/employees");
const vendorRoutes = require("./routes/vendors");
const leadRoutes = require("./routes/leads");
const bookingRoutes = require("./routes/bookings");
const itineraryRoutes = require("./routes/itineraries");
const dashboardRoutes = require("./routes/dashboard");

const app = express();

app.use(cors());
app.use(express.json());

// Health check (no auth needed) — useful to confirm the server + DB are reachable
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Public route — logging in
app.use("/api/auth", authRoutes);

// Everything below requires a valid login token
app.use("/api/employees", requireAuth, employeeRoutes);
app.use("/api/vendors", requireAuth, vendorRoutes);
app.use("/api/leads", requireAuth, leadRoutes);
app.use("/api/leads", requireAuth, bookingRoutes); // booking routes are nested under /leads/:leadId/booking
app.use("/api/leads", requireAuth, itineraryRoutes); // itinerary routes are nested under /leads/:leadId/itineraries
app.use("/api/dashboard", requireAuth, dashboardRoutes);

// Fallback 404
app.use((req, res) => {
  res.status(404).json({ error: "Route not found." });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Sasta Holiday CRM backend running on http://localhost:${PORT}`);
});
