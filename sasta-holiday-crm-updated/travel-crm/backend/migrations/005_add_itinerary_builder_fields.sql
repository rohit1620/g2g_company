-- Migration: Upgrade itinerary builder to the professional Sasta.Holiday format
-- Run this in pgAdmin 4 Query Tool on your existing database.
--
-- Adds: trip summary fields (duration, highlights, dates, pax), the
-- inclusions/exclusions/policy text blocks, tour cost, and two new
-- child tables (itinerary_hotels, itinerary_sightseeing).

-- ============================================
-- ITINERARIES — new summary / overview fields
-- ============================================
ALTER TABLE itineraries ADD COLUMN duration VARCHAR(100);          -- e.g. "5 nights / 6 Days"
ALTER TABLE itineraries ADD COLUMN highlights TEXT;
ALTER TABLE itineraries ADD COLUMN departure_date DATE;
ALTER TABLE itineraries ADD COLUMN arrival_date DATE;
ALTER TABLE itineraries ADD COLUMN adults INTEGER NOT NULL DEFAULT 1;
ALTER TABLE itineraries ADD COLUMN children INTEGER NOT NULL DEFAULT 0;
ALTER TABLE itineraries ADD COLUMN total_rooms INTEGER NOT NULL DEFAULT 1;

-- ============================================
-- ITINERARIES — "If you want" optional sections
-- Each section has an on/off flag plus its own free-text body, so the
-- builder can toggle a section without losing what was typed in it.
-- ============================================
ALTER TABLE itineraries ADD COLUMN show_inclusions BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE itineraries ADD COLUMN inclusions_text TEXT;

ALTER TABLE itineraries ADD COLUMN show_exclusions BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE itineraries ADD COLUMN exclusions_text TEXT;

ALTER TABLE itineraries ADD COLUMN show_payment_policy BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE itineraries ADD COLUMN payment_policy_text TEXT;

ALTER TABLE itineraries ADD COLUMN show_cancellation_policy BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE itineraries ADD COLUMN cancellation_policy_text TEXT;

ALTER TABLE itineraries ADD COLUMN show_terms BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE itineraries ADD COLUMN terms_text TEXT;

ALTER TABLE itineraries ADD COLUMN show_note BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE itineraries ADD COLUMN note_text TEXT;

-- ============================================
-- ITINERARIES — tour cost (kept as free text, e.g. "2,36,000/- for All Members",
-- since agents often phrase it with a per-person/per-group qualifier)
-- ============================================
ALTER TABLE itineraries ADD COLUMN tour_cost VARCHAR(200);

-- ============================================
-- ITINERARIES — optional cover photo for the PDF (uploaded screenshot/image,
-- stored as a URL/path; left NULL falls back to the default cover art)
-- ============================================
ALTER TABLE itineraries ADD COLUMN cover_image_url VARCHAR(500);

-- ============================================
-- ITINERARY DAYS — old itinerary_days had separate breakfast/lunch/dinner/
-- hotel_stay columns tied to the old simple format. The new day-wise format
-- is just a title + description per day (hotel info now lives in its own
-- table below, shown once per stay rather than repeated every day).
-- Existing data is preserved; new columns are added alongside the old ones
-- so nothing already saved is lost.
-- ============================================
ALTER TABLE itinerary_days ADD COLUMN title VARCHAR(255);
ALTER TABLE itinerary_days ADD COLUMN description TEXT;

-- ============================================
-- ITINERARY HOTELS
-- A stay can include multiple hotels (e.g. one city, then another).
-- ============================================
CREATE TABLE itinerary_hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  hotel_name VARCHAR(255) NOT NULL,
  star_rating INTEGER CHECK (star_rating BETWEEN 1 AND 7),
  location VARCHAR(255),
  rooms INTEGER NOT NULL DEFAULT 1,
  guests INTEGER NOT NULL DEFAULT 1,
  room_type VARCHAR(255),
  meal_type VARCHAR(100),            -- e.g. CP, MAP, AP, EP
  check_in DATE,
  check_out DATE
);

CREATE INDEX idx_itinerary_hotels_itinerary_id ON itinerary_hotels(itinerary_id);

-- ============================================
-- ITINERARY SIGHTSEEING
-- Each sightseeing item is tagged with exactly one tour type.
-- ============================================
CREATE TABLE itinerary_sightseeing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  title VARCHAR(255) NOT NULL,
  tour_type VARCHAR(20) NOT NULL DEFAULT 'PRIVATE'
    CHECK (tour_type IN ('PRIVATE', 'SIC', 'TICKET_ONLY'))
);

CREATE INDEX idx_itinerary_sightseeing_itinerary_id ON itinerary_sightseeing(itinerary_id);
