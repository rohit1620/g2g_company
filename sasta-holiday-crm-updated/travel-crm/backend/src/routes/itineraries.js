const express = require("express");
const pool = require("../db/pool");
const { generateItineraryPdf } = require("../utils/itineraryPdf");

const router = express.Router();

const TOUR_TYPES = ["PRIVATE", "SIC", "TICKET_ONLY"];

// ============================================
// Helpers
// ============================================
async function fetchFullItinerary(client, itineraryId) {
  const itineraryResult = await client.query("SELECT * FROM itineraries WHERE id = $1", [itineraryId]);
  if (itineraryResult.rows.length === 0) return null;

  const [daysResult, hotelsResult, sightseeingResult] = await Promise.all([
    client.query(
      "SELECT * FROM itinerary_days WHERE itinerary_id = $1 ORDER BY day_number ASC",
      [itineraryId]
    ),
    client.query(
      "SELECT * FROM itinerary_hotels WHERE itinerary_id = $1 ORDER BY sort_order ASC",
      [itineraryId]
    ),
    client.query(
      "SELECT * FROM itinerary_sightseeing WHERE itinerary_id = $1 ORDER BY sort_order ASC",
      [itineraryId]
    ),
  ]);

  return {
    ...itineraryResult.rows[0],
    days: daysResult.rows,
    hotels: hotelsResult.rows,
    sightseeing: sightseeingResult.rows,
  };
}

// ============================================
// GET /api/leads/:leadId/itineraries — list all itineraries for a lead (titles only)
// ============================================
router.get("/:leadId/itineraries", async (req, res) => {
  const { leadId } = req.params;
  try {
    const result = await pool.query(
      `SELECT id, lead_id, title, duration, departure_date, arrival_date, tour_cost, created_by, created_at, updated_at
       FROM itineraries WHERE lead_id = $1 ORDER BY created_at DESC`,
      [leadId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch itineraries." });
  }
});

// ============================================
// GET /api/leads/:leadId/itineraries/:itineraryId — full itinerary incl.
// days, hotels, and sightseeing
// ============================================
router.get("/:leadId/itineraries/:itineraryId", async (req, res) => {
  const { itineraryId } = req.params;
  try {
    const full = await fetchFullItinerary(pool, itineraryId);
    if (!full) {
      return res.status(404).json({ error: "Itinerary not found." });
    }
    res.json(full);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch itinerary." });
  }
});

// ============================================
// POST /api/leads/:leadId/itineraries — create a new (blank, or pre-filled) itinerary
// Body: { title, created_by, ...any overview fields, days?, hotels?, sightseeing? }
// Only title and created_by are required — everything else can be filled in
// afterwards through the builder and saved with PUT.
// ============================================
router.post("/:leadId/itineraries", async (req, res) => {
  const { leadId } = req.params;
  const { title, created_by } = req.body;

  if (!title || !created_by) {
    return res.status(400).json({ error: "title and created_by are required." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO itineraries (lead_id, title, created_by) VALUES ($1, $2, $3) RETURNING *`,
      [leadId, title, created_by]
    );
    res.status(201).json({ ...result.rows[0], days: [], hotels: [], sightseeing: [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create itinerary." });
  }
});

// ============================================
// PATCH /api/leads/:leadId/itineraries/:itineraryId — rename itinerary
// Body: { title }
// (Kept for quick renames from a list view; full edits go through PUT below.)
// ============================================
router.patch("/:leadId/itineraries/:itineraryId", async (req, res) => {
  const { itineraryId } = req.params;
  const { title } = req.body;
  if (!title) {
    return res.status(400).json({ error: "title is required." });
  }
  try {
    const result = await pool.query(
      "UPDATE itineraries SET title = $1 WHERE id = $2 RETURNING *",
      [title, itineraryId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Itinerary not found." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update itinerary." });
  }
});

// ============================================
// PUT /api/leads/:leadId/itineraries/:itineraryId — save the full builder in one go
// Body: {
//   title, duration, highlights, departure_date, arrival_date,
//   adults, children, total_rooms, tour_cost, cover_image_url,
//   show_inclusions, inclusions_text, show_exclusions, exclusions_text,
//   show_payment_policy, payment_policy_text,
//   show_cancellation_policy, cancellation_policy_text,
//   show_terms, terms_text, show_note, note_text,
//   days: [{ day_number, day_date, title, description }],
//   hotels: [{ hotel_name, star_rating, location, rooms, guests, room_type, meal_type, check_in, check_out }],
//   sightseeing: [{ title, tour_type }]
// }
// Replaces all days/hotels/sightseeing rows (delete + reinsert), same
// approach as the old days-only endpoint, just extended to every section
// of the builder in a single transaction.
// ============================================
router.put("/:leadId/itineraries/:itineraryId", async (req, res) => {
  const { itineraryId } = req.params;
  const {
    title,
    duration,
    highlights,
    departure_date,
    arrival_date,
    adults,
    children,
    total_rooms,
    tour_cost,
    cover_image_url,
    show_inclusions,
    inclusions_text,
    show_exclusions,
    exclusions_text,
    show_payment_policy,
    payment_policy_text,
    show_cancellation_policy,
    cancellation_policy_text,
    show_terms,
    terms_text,
    show_note,
    note_text,
    days,
    hotels,
    sightseeing,
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: "title is required." });
  }
  if (days !== undefined && !Array.isArray(days)) {
    return res.status(400).json({ error: "days must be an array." });
  }
  if (hotels !== undefined && !Array.isArray(hotels)) {
    return res.status(400).json({ error: "hotels must be an array." });
  }
  if (sightseeing !== undefined && !Array.isArray(sightseeing)) {
    return res.status(400).json({ error: "sightseeing must be an array." });
  }
  if (Array.isArray(sightseeing)) {
    const badType = sightseeing.find((s) => s.tour_type && !TOUR_TYPES.includes(s.tour_type));
    if (badType) {
      return res.status(400).json({ error: `tour_type must be one of ${TOUR_TYPES.join(", ")}.` });
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query("SELECT id FROM itineraries WHERE id = $1", [itineraryId]);
    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Itinerary not found." });
    }

    await client.query(
      `UPDATE itineraries SET
         title = $1,
         duration = $2,
         highlights = $3,
         departure_date = $4,
         arrival_date = $5,
         adults = $6,
         children = $7,
         total_rooms = $8,
         tour_cost = $9,
         cover_image_url = $10,
         show_inclusions = $11,
         inclusions_text = $12,
         show_exclusions = $13,
         exclusions_text = $14,
         show_payment_policy = $15,
         payment_policy_text = $16,
         show_cancellation_policy = $17,
         cancellation_policy_text = $18,
         show_terms = $19,
         terms_text = $20,
         show_note = $21,
         note_text = $22
       WHERE id = $23`,
      [
        title.trim(),
        duration || null,
        highlights || null,
        departure_date || null,
        arrival_date || null,
        adults ?? 1,
        children ?? 0,
        total_rooms ?? 1,
        tour_cost || null,
        cover_image_url || null,
        show_inclusions ?? true,
        inclusions_text || null,
        show_exclusions ?? true,
        exclusions_text || null,
        show_payment_policy ?? false,
        payment_policy_text || null,
        show_cancellation_policy ?? false,
        cancellation_policy_text || null,
        show_terms ?? false,
        terms_text || null,
        show_note ?? false,
        note_text || null,
        itineraryId,
      ]
    );

    if (Array.isArray(days)) {
      await client.query("DELETE FROM itinerary_days WHERE itinerary_id = $1", [itineraryId]);
      for (let i = 0; i < days.length; i++) {
        const d = days[i];
        await client.query(
          `INSERT INTO itinerary_days
             (itinerary_id, day_number, day_date, title, description, location, activities, breakfast, lunch, dinner, hotel_stay, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            itineraryId,
            d.day_number ?? i + 1,
            d.day_date || null,
            d.title || null,
            d.description || null,
            d.location || null,
            d.activities || null,
            !!d.breakfast,
            !!d.lunch,
            !!d.dinner,
            d.hotel_stay || null,
            d.notes || null,
          ]
        );
      }
    }

    if (Array.isArray(hotels)) {
      await client.query("DELETE FROM itinerary_hotels WHERE itinerary_id = $1", [itineraryId]);
      for (let i = 0; i < hotels.length; i++) {
        const h = hotels[i];
        if (!h.hotel_name || !h.hotel_name.trim()) continue;
        await client.query(
          `INSERT INTO itinerary_hotels
             (itinerary_id, sort_order, hotel_name, star_rating, location, rooms, guests, room_type, meal_type, check_in, check_out)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            itineraryId,
            i,
            h.hotel_name.trim(),
            h.star_rating || null,
            h.location || null,
            h.rooms ?? 1,
            h.guests ?? 1,
            h.room_type || null,
            h.meal_type || null,
            h.check_in || null,
            h.check_out || null,
          ]
        );
      }
    }

    if (Array.isArray(sightseeing)) {
      await client.query("DELETE FROM itinerary_sightseeing WHERE itinerary_id = $1", [itineraryId]);
      for (let i = 0; i < sightseeing.length; i++) {
        const s = sightseeing[i];
        if (!s.title || !s.title.trim()) continue;
        await client.query(
          `INSERT INTO itinerary_sightseeing (itinerary_id, sort_order, title, tour_type)
           VALUES ($1,$2,$3,$4)`,
          [itineraryId, i, s.title.trim(), s.tour_type || "PRIVATE"]
        );
      }
    }

    await client.query("COMMIT");

    const full = await fetchFullItinerary(pool, itineraryId);
    res.json(full);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Failed to save itinerary." });
  } finally {
    client.release();
  }
});

// ============================================
// DELETE /api/leads/:leadId/itineraries/:itineraryId — remove a draft itinerary
// (Itineraries are drafts/proposals, not financial records, so deletion is allowed
//  — unlike leads, where we keep full history.)
// ============================================
router.delete("/:leadId/itineraries/:itineraryId", async (req, res) => {
  const { itineraryId } = req.params;
  try {
    const result = await pool.query("DELETE FROM itineraries WHERE id = $1 RETURNING id", [itineraryId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Itinerary not found." });
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete itinerary." });
  }
});

// ============================================
// GET /api/leads/:leadId/itineraries/:itineraryId/pdf — download as PDF
// ============================================
router.get("/:leadId/itineraries/:itineraryId/pdf", async (req, res) => {
  const { leadId, itineraryId } = req.params;
  try {
    const leadResult = await pool.query("SELECT * FROM leads WHERE id = $1", [leadId]);
    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: "Lead not found." });
    }

    const full = await fetchFullItinerary(pool, itineraryId);
    if (!full) {
      return res.status(404).json({ error: "Itinerary not found." });
    }

    generateItineraryPdf(res, {
      lead: leadResult.rows[0],
      itinerary: full,
      days: full.days,
      hotels: full.hotels,
      sightseeing: full.sightseeing,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate itinerary PDF." });
  }
});

module.exports = router;
