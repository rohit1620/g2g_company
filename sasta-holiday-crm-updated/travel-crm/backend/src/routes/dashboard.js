const express = require("express");
const pool = require("../db/pool");

const router = express.Router();

// GET /api/dashboard — summary stats for the dashboard page
router.get("/", async (req, res) => {
  try {
    const [totalLeads, statusCounts, revenue, recentLeads] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM leads"),
      pool.query("SELECT status, COUNT(*) FROM leads GROUP BY status"),
      pool.query(
        "SELECT COALESCE(SUM(total_amount), 0) AS total, COALESCE(SUM(advance_paid), 0) AS collected FROM bookings"
      ),
      pool.query(
        `SELECT l.id, l.lead_number, l.customer_name, l.destination, l.travel_date, l.status,
                e.name AS assigned_to_name
         FROM leads l
         LEFT JOIN employees e ON e.id = l.assigned_to
         ORDER BY l.created_at DESC
         LIMIT 5`
      ),
    ]);

    const total = parseInt(totalLeads.rows[0].count, 10);
    const confirmed =
      parseInt(
        statusCounts.rows.find((r) => r.status === "Confirmed")?.count || 0,
        10
      ) || 0;
    const conversionRate = total ? Math.round((confirmed / total) * 100) : 0;

    res.json({
      totalLeads: total,
      conversionRate,
      revenue: Number(revenue.rows[0].total),
      collected: Number(revenue.rows[0].collected),
      statusCounts: statusCounts.rows.reduce(
        (acc, row) => ({ ...acc, [row.status]: parseInt(row.count, 10) }),
        {}
      ),
      recentLeads: recentLeads.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch dashboard stats." });
  }
});

module.exports = router;
