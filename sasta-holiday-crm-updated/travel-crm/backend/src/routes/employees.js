const express = require("express");
const pool = require("../db/pool");

const router = express.Router();

// GET /api/employees — list all (active + inactive, frontend filters as needed)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, is_active, created_at FROM employees ORDER BY name ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch employees." });
  }
});

// POST /api/employees — add a new employee
// Body: { name }
router.post("/", async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Employee name is required." });
  }
  try {
    const result = await pool.query(
      "INSERT INTO employees (name) VALUES ($1) RETURNING id, name, is_active, created_at",
      [name.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add employee." });
  }
});

// PATCH /api/employees/:id — toggle active/inactive
// Body: { is_active }
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;
  try {
    const result = await pool.query(
      "UPDATE employees SET is_active = $1 WHERE id = $2 RETURNING id, name, is_active, created_at",
      [is_active, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Employee not found." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update employee." });
  }
});

module.exports = router;
