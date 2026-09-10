require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

const catalogRoutes = require("./routes/catalog");
const paperRoutes = require("./routes/papers");
const adminRoutes = require("./routes/admin");

const app = express();

const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",");
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/catalog", catalogRoutes);
app.use("/api/papers", paperRoutes);
app.use("/api/admin", adminRoutes);

// Friendly error handler for multer/file errors so the frontend gets clean JSON
app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: err.message || "Something went wrong" });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`PYQ Hub API running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
