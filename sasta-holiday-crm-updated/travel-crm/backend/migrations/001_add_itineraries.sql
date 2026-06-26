-- Migration: Add Itinerary Builder
-- Run this in pgAdmin 4 if you already ran the original schema.sql earlier.
-- (If you're setting up the database for the first time, just run schema.sql
--  instead — it already includes these tables.)

CREATE TABLE itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  created_by VARCHAR(150) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_itineraries_lead_id ON itineraries(lead_id);

CREATE TRIGGER trg_itineraries_updated_at
BEFORE UPDATE ON itineraries
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE itinerary_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  day_date DATE,
  location VARCHAR(200),
  activities TEXT,
  breakfast BOOLEAN NOT NULL DEFAULT FALSE,
  lunch BOOLEAN NOT NULL DEFAULT FALSE,
  dinner BOOLEAN NOT NULL DEFAULT FALSE,
  hotel_stay VARCHAR(200),
  notes TEXT
);

CREATE INDEX idx_itinerary_days_itinerary_id ON itinerary_days(itinerary_id);
