const express = require("express");
const pool = require("../db/pool");
const { generateInvoicePdf } = require("../utils/invoicePdf");

const router = express.Router();

// ============================================
// POST /api/leads/:leadId/booking — create a booking for a confirmed lead
// Body: { total_amount, advance_paid }
// ============================================
router.post("/:leadId/booking", async (req, res) => {
  const { leadId } = req.params;
  const { total_amount, advance_paid } = req.body;

  if (total_amount === undefined || total_amount === null) {
    return res.status(400).json({ error: "total_amount is required." });
  }

  try {
    const leadCheck = await pool.query("SELECT id FROM leads WHERE id = $1", [leadId]);
    if (leadCheck.rows.length === 0) {
      return res.status(404).json({ error: "Lead not found." });
    }

    const result = await pool.query(
      `INSERT INTO bookings (lead_id, total_amount, advance_paid)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [leadId, total_amount, advance_paid || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "A booking already exists for this lead." });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to create booking." });
  }
});

// ============================================
// PATCH /api/leads/:leadId/booking — update payment (e.g. record more advance paid)
// Body: { total_amount?, advance_paid? }
// ============================================
router.patch("/:leadId/booking", async (req, res) => {
  const { leadId } = req.params;
  const { total_amount, advance_paid } = req.body;

  try {
    const existing = await pool.query("SELECT * FROM bookings WHERE lead_id = $1", [leadId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "No booking found for this lead." });
    }
    const current = existing.rows[0];

    const result = await pool.query(
      `UPDATE bookings SET total_amount = $1, advance_paid = $2 WHERE lead_id = $3 RETURNING *`,
      [
        total_amount !== undefined ? total_amount : current.total_amount,
        advance_paid !== undefined ? advance_paid : current.advance_paid,
        leadId,
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update booking." });
  }
});

// ============================================
// GET /api/leads/:leadId/booking/invoice — download invoice as PDF
// ============================================
router.get("/:leadId/booking/invoice", async (req, res) => {
  const { leadId } = req.params;
  try {
    const leadResult = await pool.query("SELECT * FROM leads WHERE id = $1", [leadId]);
    const bookingResult = await pool.query("SELECT * FROM bookings WHERE lead_id = $1", [leadId]);

    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: "Lead not found." });
    }
    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: "No booking found for this lead." });
    }

    generateInvoicePdf(res, { lead: leadResult.rows[0], booking: bookingResult.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate invoice." });
  }
});

// ============================================
// GET /api/leads/:leadId/booking/installments — list all payments for this booking
// ============================================
router.get("/:leadId/booking/installments", async (req, res) => {
  const { leadId } = req.params;
  try {
    const booking = await pool.query("SELECT id FROM bookings WHERE lead_id = $1", [leadId]);
    if (booking.rows.length === 0) {
      return res.status(404).json({ error: "No booking found for this lead." });
    }
    const result = await pool.query(
      "SELECT * FROM payment_installments WHERE booking_id = $1 ORDER BY paid_on DESC, created_at DESC",
      [booking.rows[0].id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch payment history." });
  }
});

// ============================================
// POST /api/leads/:leadId/booking/installments — record a new payment
// Body: { amount, paid_on, payment_method, recorded_by }
// Automatically updates booking.advance_paid to keep totals in sync.
// ============================================
router.post("/:leadId/booking/installments", async (req, res) => {
  const { leadId } = req.params;
  const { amount, paid_on, payment_method, recorded_by } = req.body;

  if (!amount || !recorded_by) {
    return res.status(400).json({ error: "amount and recorded_by are required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const booking = await client.query("SELECT * FROM bookings WHERE lead_id = $1", [leadId]);
    if (booking.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "No booking found for this lead." });
    }
    const bookingRow = booking.rows[0];

    const installment = await client.query(
      `INSERT INTO payment_installments (booking_id, amount, paid_on, payment_method, recorded_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [bookingRow.id, amount, paid_on || new Date(), payment_method || null, recorded_by]
    );

    const newAdvancePaid = Number(bookingRow.advance_paid) + Number(amount);
    const updatedBooking = await client.query(
      "UPDATE bookings SET advance_paid = $1 WHERE id = $2 RETURNING *",
      [newAdvancePaid, bookingRow.id]
    );

    await client.query("COMMIT");
    res.status(201).json({ installment: installment.rows[0], booking: updatedBooking.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Failed to record payment." });
  } finally {
    client.release();
  }
});

module.exports = router;
