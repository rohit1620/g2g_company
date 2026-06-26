const express = require("express");
const pool = require("../db/pool");

const router = express.Router();

// ============================================
// GET /api/leads — list all leads (table view)
// Supports optional query params: ?status=Confirmed&search=vikram
// ============================================
router.get("/", async (req, res) => {
  const { status, search } = req.query;
  const conditions = [];
  const values = [];

  if (status) {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }
  if (search) {
    values.push(`%${search}%`);
    conditions.push(
      `(customer_name ILIKE $${values.length} OR destination ILIKE $${values.length} OR lead_number ILIKE $${values.length})`
    );
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const result = await pool.query(
      `SELECT
         l.id, l.lead_number, l.customer_name, l.phone, l.email,
         l.travel_date, l.destination, l.lead_source, l.lead_source_other,
         l.vendor_id, v.name AS vendor_name, l.vendor_other,
         l.status, l.current_phase, l.assigned_to, e.name AS assigned_to_name,
         l.created_by, l.created_at
       FROM leads l
       LEFT JOIN vendors v ON v.id = l.vendor_id
       LEFT JOIN employees e ON e.id = l.assigned_to
       ${whereClause}
       ORDER BY l.created_at DESC`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch leads." });
  }
});

// ============================================
// GET /api/leads/:id — full lead detail incl. history, notes, booking
// ============================================
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const leadResult = await pool.query(
      `SELECT
         l.*, v.name AS vendor_name, e.name AS assigned_to_name
       FROM leads l
       LEFT JOIN vendors v ON v.id = l.vendor_id
       LEFT JOIN employees e ON e.id = l.assigned_to
       WHERE l.id = $1`,
      [id]
    );
    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: "Lead not found." });
    }
    const lead = leadResult.rows[0];

    const [notes, statusHistory, assignmentHistory, tripDetailHistory, phaseHistory, phase3History, booking] =
      await Promise.all([
        pool.query(
          "SELECT id, note_text, added_by, added_at FROM lead_notes WHERE lead_id = $1 ORDER BY added_at DESC",
          [id]
        ),
        pool.query(
          "SELECT id, old_status, new_status, note, changed_by, changed_at FROM lead_status_history WHERE lead_id = $1 ORDER BY changed_at DESC",
          [id]
        ),
        pool.query(
          `SELECT h.id, h.old_assigned_to, oe.name AS old_assigned_to_name,
                  h.new_assigned_to, ne.name AS new_assigned_to_name,
                  h.note, h.changed_by, h.changed_at
           FROM lead_assignment_history h
           LEFT JOIN employees oe ON oe.id = h.old_assigned_to
           LEFT JOIN employees ne ON ne.id = h.new_assigned_to
           WHERE h.lead_id = $1 ORDER BY h.changed_at DESC`,
          [id]
        ),
        pool.query(
          "SELECT id, note, changed_by, changed_at FROM lead_trip_detail_history WHERE lead_id = $1 ORDER BY changed_at DESC",
          [id]
        ),
      pool.query(
          "SELECT id, old_phase, new_phase, note, changed_by, changed_at FROM lead_phase_history WHERE lead_id = $1 ORDER BY changed_at DESC",
          [id]
        ),
        pool.query(
          "SELECT id, note, changed_by, changed_at FROM lead_phase3_history WHERE lead_id = $1 ORDER BY changed_at DESC",
          [id]
        ),
        pool.query("SELECT * FROM bookings WHERE lead_id = $1", [id]),
      ]);
   res.json({
      ...lead,
      notes: notes.rows,
      statusHistory: statusHistory.rows,
      assignmentHistory: assignmentHistory.rows,
      tripDetailHistory: tripDetailHistory.rows,
      phaseHistory: phaseHistory.rows,
      phase3History: phase3History.rows,
      booking: booking.rows[0] || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch lead." });
  }
});

// ============================================
// POST /api/leads — create a new lead
// Step 1 of the wizard sends just name/phone/email; step 2 sends the rest
// in the same call once the user clicks through. Only customer_name, phone,
// email, and created_by are required by the API itself.
// ============================================
router.post("/", async (req, res) => {
  const {
    customer_name,
    phone,
    email,
    travel_date,
    destination,
    hotel_preference,
    lead_source,
    lead_source_other,
    regarding,
    regarding_other,
    vendor_id,
    vendor_other,
    assigned_to,
    created_by,
    initial_note,
  } = req.body;

  if (!customer_name || !phone || !email || !created_by) {
    return res
      .status(400)
      .json({ error: "Customer name, phone, email, and your name (created_by) are required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const status = assigned_to ? "Assigned" : "Not Assigned";

    const leadResult = await client.query(
      `INSERT INTO leads (
         customer_name, phone, email, travel_date, destination, hotel_preference,
         lead_source, lead_source_other, regarding, regarding_other,
         vendor_id, vendor_other, assigned_to, status, created_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        customer_name,
        phone,
        email,
        travel_date || null,
        destination || null,
        hotel_preference || null,
        lead_source || null,
        lead_source_other || null,
        regarding || "Package",
        regarding_other || null,
        vendor_id || null,
        vendor_other || null,
        assigned_to || null,
        status,
        created_by,
      ]
    );
    const lead = leadResult.rows[0];

    // Log the initial status (Not Assigned or Assigned). Creation doesn't
    // need a separate mandatory note — the "note" here just records that
    // this was the lead's creation.
    await client.query(
      `INSERT INTO lead_status_history (lead_id, old_status, new_status, note, changed_by)
       VALUES ($1, NULL, $2, $3, $4)`,
      [lead.id, status, "Lead created", created_by]
    );

    // If assigned at creation, log that too
    if (assigned_to) {
      await client.query(
        `INSERT INTO lead_assignment_history (lead_id, old_assigned_to, new_assigned_to, note, changed_by)
         VALUES ($1, NULL, $2, $3, $4)`,
        [lead.id, assigned_to, "Assigned at creation", created_by]
      );
    }

    // Optional first note (general log, not the mandatory kind)
    if (initial_note && initial_note.trim()) {
      await client.query(
        `INSERT INTO lead_notes (lead_id, note_text, added_by) VALUES ($1, $2, $3)`,
        [lead.id, initial_note.trim(), created_by]
      );
    }

    await client.query("COMMIT");
    res.status(201).json(lead);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Failed to create lead." });
  } finally {
    client.release();
  }
});

// ============================================
// PATCH /api/leads/:id/trip-details — edit trip info
// Body: { ...fields, note, changed_by }
// A note is REQUIRED explaining the edit. Only allowed while the lead
// is in Phase 1 (enforced here, not just in the UI).
// ============================================
router.patch("/:id/trip-details", async (req, res) => {
  const { id } = req.params;
  const {
    destination,
    travel_date,
    hotel_preference,
    regarding,
    regarding_other,
    vendor_id,
    vendor_other,
    lead_source,
    lead_source_other,
    note,
    changed_by,
  } = req.body;

  if (!note || !note.trim() || !changed_by) {
    return res.status(400).json({ error: "A note explaining the change and changed_by are required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const current = await client.query("SELECT current_phase FROM leads WHERE id = $1", [id]);
    if (current.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Lead not found." });
    }
    if (current.rows[0].current_phase !== 1) {
      await client.query("ROLLBACK");
      return res
        .status(409)
        .json({ error: "Trip details can only be edited while the lead is in Phase 1. Move it back to Phase 1 first." });
    }

    const result = await client.query(
      `UPDATE leads SET
         destination = $1, travel_date = $2, hotel_preference = $3,
         regarding = $4, regarding_other = $5,
         vendor_id = $6, vendor_other = $7,
         lead_source = $8, lead_source_other = $9
       WHERE id = $10
       RETURNING *`,
      [
        destination || null,
        travel_date || null,
        hotel_preference || null,
        regarding || "Package",
        regarding_other || null,
        vendor_id || null,
        vendor_other || null,
        lead_source || null,
        lead_source_other || null,
        id,
      ]
    );

    await client.query(
      `INSERT INTO lead_trip_detail_history (lead_id, note, changed_by) VALUES ($1, $2, $3)`,
      [id, note.trim(), changed_by]
    );

    await client.query("COMMIT");
    res.json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Failed to update trip details." });
  } finally {
    client.release();
  }
});

// ============================================
// PATCH /api/leads/:id/status — change status, logs to lead_status_history
// Body: { new_status, note, changed_by }
// A note explaining the change is REQUIRED.
// ============================================
router.patch("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { new_status, note, changed_by } = req.body;

  if (!new_status || !changed_by) {
    return res.status(400).json({ error: "new_status and changed_by are required." });
  }
  if (!note || !note.trim()) {
    return res.status(400).json({ error: "A note explaining the status change is required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const current = await client.query("SELECT status FROM leads WHERE id = $1", [id]);
    if (current.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Lead not found." });
    }
    const oldStatus = current.rows[0].status;

    const updated = await client.query(
      "UPDATE leads SET status = $1 WHERE id = $2 RETURNING *",
      [new_status, id]
    );

    await client.query(
      `INSERT INTO lead_status_history (lead_id, old_status, new_status, note, changed_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, oldStatus, new_status, note.trim(), changed_by]
    );

    await client.query("COMMIT");
    res.json(updated.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Failed to update status." });
  } finally {
    client.release();
  }
});

// ============================================
// PATCH /api/leads/:id/assign — reassign lead, logs to lead_assignment_history
// Body: { new_assigned_to, note, changed_by }
// A note explaining the reassignment is REQUIRED.
// ============================================
router.patch("/:id/assign", async (req, res) => {
  const { id } = req.params;
  const { new_assigned_to, note, changed_by } = req.body;

  if (!new_assigned_to || !changed_by) {
    return res.status(400).json({ error: "new_assigned_to and changed_by are required." });
  }
  if (!note || !note.trim()) {
    return res.status(400).json({ error: "A note explaining the reassignment is required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const current = await client.query("SELECT assigned_to, status FROM leads WHERE id = $1", [id]);
    if (current.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Lead not found." });
    }
    const oldAssignedTo = current.rows[0].assigned_to;

    // If lead was "Not Assigned", move it to "Assigned" automatically
    const oldStatus = current.rows[0].status;
    const newStatus = oldStatus === "Not Assigned" ? "Assigned" : oldStatus;

    const updated = await client.query(
      "UPDATE leads SET assigned_to = $1, status = $2 WHERE id = $3 RETURNING *",
      [new_assigned_to, newStatus, id]
    );

    await client.query(
      `INSERT INTO lead_assignment_history (lead_id, old_assigned_to, new_assigned_to, note, changed_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, oldAssignedTo, new_assigned_to, note.trim(), changed_by]
    );

    if (newStatus !== oldStatus) {
      await client.query(
        `INSERT INTO lead_status_history (lead_id, old_status, new_status, note, changed_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, oldStatus, newStatus, "Automatically updated after assignment", changed_by]
      );
    }

    await client.query("COMMIT");
    res.json(updated.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Failed to reassign lead." });
  } finally {
    client.release();
  }
});

// ============================================
// PATCH /api/leads/:id/phase — move a lead forward or back between phases
// Body: { new_phase, note, changed_by }
// A note explaining the move is REQUIRED. Phases: 1 = Lead Generation, 2 = Vendor + Itinerary
// ============================================
router.patch("/:id/phase", async (req, res) => {
  const { id } = req.params;
  const { new_phase, note, changed_by } = req.body;

  if (!new_phase || !changed_by) {
    return res.status(400).json({ error: "new_phase and changed_by are required." });
  }
  if (![1, 2, 3].includes(Number(new_phase))) {
    return res.status(400).json({ error: "new_phase must be 1, 2, or 3." });
  }
  if (!note || !note.trim()) {
    return res.status(400).json({ error: "A note explaining the phase move is required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const current = await client.query("SELECT current_phase FROM leads WHERE id = $1", [id]);
    if (current.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Lead not found." });
    }
    const oldPhase = current.rows[0].current_phase;

    const updated = await client.query(
      "UPDATE leads SET current_phase = $1 WHERE id = $2 RETURNING *",
      [new_phase, id]
    );

    await client.query(
      `INSERT INTO lead_phase_history (lead_id, old_phase, new_phase, note, changed_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, oldPhase, new_phase, note.trim(), changed_by]
    );

    await client.query("COMMIT");
    res.json(updated.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Failed to move lead phase." });
  } finally {
    client.release();
  }
});

// ============================================
// POST /api/leads/:id/notes — add a note (never edited/deleted, just appended)
// Body: { note_text, added_by }
// This is the GENERAL notes log — separate from the mandatory notes
// attached to status/assignment/trip-detail changes above.
// ============================================
router.post("/:id/notes", async (req, res) => {
  const { id } = req.params;
  const { note_text, added_by } = req.body;

  if (!note_text || !note_text.trim() || !added_by) {
    return res.status(400).json({ error: "note_text and added_by are required." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO lead_notes (lead_id, note_text, added_by) VALUES ($1, $2, $3) RETURNING *`,
      [id, note_text.trim(), added_by]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add note." });
  }
});

// ============================================
// PATCH /api/leads/:id/phase3-details — update margin, client review, close status
// Body: { margin_amount, review_rating, review_comment, close_status, note, changed_by }
// A note is REQUIRED. Only meaningful while the lead is in Phase 3
// (not strictly enforced here since these fields are harmless to set early,
// but the UI only shows this section in Phase 3).
// ============================================
router.patch("/:id/phase3-details", async (req, res) => {
  const { id } = req.params;
  const { margin_amount, review_rating, review_comment, close_status, note, changed_by } = req.body;

  if (!note || !note.trim() || !changed_by) {
    return res.status(400).json({ error: "A note explaining the change and changed_by are required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const current = await client.query("SELECT id FROM leads WHERE id = $1", [id]);
    if (current.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Lead not found." });
    }

    const result = await client.query(
      `UPDATE leads SET
         margin_amount = $1,
         review_rating = $2,
         review_comment = $3,
         close_status = $4
       WHERE id = $5
       RETURNING *`,
      [
        margin_amount || null,
        review_rating || null,
        review_comment || null,
        close_status || "Not Closed",
        id,
      ]
    );

    await client.query(
      `INSERT INTO lead_phase3_history (lead_id, note, changed_by) VALUES ($1, $2, $3)`,
      [id, note.trim(), changed_by]
    );

    await client.query("COMMIT");
    res.json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Failed to update phase 3 details." });
  } finally {
    client.release();
  }
});

module.exports = router;