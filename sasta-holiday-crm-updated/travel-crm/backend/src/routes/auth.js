const express = require("express");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const router = express.Router();

// POST /api/auth/login
// Body: { username, password }
// Checks against the single shared credentials stored in .env
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  if (username !== process.env.CRM_USERNAME || password !== process.env.CRM_PASSWORD) {
    return res.status(401).json({ error: "Invalid username or password." });
  }

  const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: "12h" });
  res.json({ token });
});

module.exports = router;
