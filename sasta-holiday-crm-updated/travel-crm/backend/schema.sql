-- Sasta Holiday CRM — Database Schema
-- Run this in pgAdmin 4 (Query Tool) on a fresh database, e.g. "sasta_holiday_crm"
-- This single file includes everything (base schema + all migrations 001-005 to date).

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- EMPLOYEES
-- Shared login is used by everyone; this table is just a name list
-- used in dropdowns ("who is doing this action").
-- ============================================
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- VENDORS
-- Same idea as employees — a managed dropdown list.
-- ============================================
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- LEADS
-- Only customer_name, phone, email are required.
-- Everything else can be filled in later.
-- current_phase: 1 = Lead Generation, 2 = Vendor + Itinerary
-- ============================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_number VARCHAR(20) UNIQUE NOT NULL, -- e.g. L-1001, human-friendly ID

  customer_name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(150) NOT NULL,

  travel_date DATE,
  destination VARCHAR(200),
  hotel_preference VARCHAR(255),

  lead_source VARCHAR(30),          -- Instagram, Facebook, Google Ads, Website, Direct, Other
  lead_source_other VARCHAR(200),

  regarding VARCHAR(20) DEFAULT 'Package', -- Package, Flight, Other
  regarding_other VARCHAR(200),

  vendor_id UUID REFERENCES vendors(id),
  vendor_other VARCHAR(200),        -- used when vendor isn't in the managed list

  status VARCHAR(20) NOT NULL DEFAULT 'Not Assigned',
  -- Not Assigned, Assigned, In Process, Follow-up, Confirmed, Cancelled, Lost

  current_phase INTEGER NOT NULL DEFAULT 1, -- 1 = Lead Generation, 2 = Vendor + Itinerary, 3 = Margin/Review/Close

  assigned_to UUID REFERENCES employees(id),

  created_by VARCHAR(150) NOT NULL, -- employee name who created the lead (shared login)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Phase 3 fields
  margin_amount NUMERIC(12, 2),
  review_rating INTEGER CHECK (review_rating BETWEEN 1 AND 5),
  review_comment TEXT,
  close_status VARCHAR(20) NOT NULL DEFAULT 'Not Closed' -- Not Closed, Closed - Won, Closed - Lost
);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_current_phase ON leads(current_phase);

-- Auto-generate lead_number like L-1001, L-1002, ...
CREATE SEQUENCE lead_number_seq START 1001;

CREATE OR REPLACE FUNCTION set_lead_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lead_number IS NULL THEN
    NEW.lead_number := 'L-' || nextval('lead_number_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_lead_number
BEFORE INSERT ON leads
FOR EACH ROW
EXECUTE FUNCTION set_lead_number();

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leads_updated_at
BEFORE UPDATE ON leads
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ============================================
-- LEAD NOTES
-- General running log — notes are never edited or deleted, only added.
-- (Separate from the mandatory notes attached to status/assignment/trip-detail changes below.)
-- ============================================
CREATE TABLE lead_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  added_by VARCHAR(150) NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lead_notes_lead_id ON lead_notes(lead_id);

-- ============================================
-- LEAD STATUS HISTORY
-- Every status change is logged here automatically. A note is REQUIRED
-- (enforced by the API) explaining why the status changed.
-- ============================================
CREATE TABLE lead_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  old_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  note TEXT NOT NULL,
  changed_by VARCHAR(150) NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lead_status_history_lead_id ON lead_status_history(lead_id);

-- ============================================
-- LEAD ASSIGNMENT HISTORY
-- Every reassignment is logged here automatically, with a required note.
-- ============================================
CREATE TABLE lead_assignment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  old_assigned_to UUID REFERENCES employees(id),
  new_assigned_to UUID NOT NULL REFERENCES employees(id),
  note TEXT NOT NULL,
  changed_by VARCHAR(150) NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lead_assignment_history_lead_id ON lead_assignment_history(lead_id);

-- ============================================
-- LEAD TRIP-DETAIL EDIT HISTORY
-- Every trip-detail edit (destination, dates, hotel, vendor, source, regarding)
-- requires a note explaining the change.
-- ============================================
CREATE TABLE lead_trip_detail_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  changed_by VARCHAR(150) NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lead_trip_detail_history_lead_id ON lead_trip_detail_history(lead_id);

-- ============================================
-- LEAD PHASE HISTORY
-- Tracks moving a lead forward/back between phases. Requires a note.
-- ============================================
CREATE TABLE lead_phase_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  old_phase INTEGER NOT NULL,
  new_phase INTEGER NOT NULL,
  note TEXT NOT NULL,
  changed_by VARCHAR(150) NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lead_phase_history_lead_id ON lead_phase_history(lead_id);

-- ============================================
-- LEAD PHASE 3 HISTORY
-- Tracks edits to margin, client review, and close status. Requires a note.
-- ============================================
CREATE TABLE lead_phase3_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  changed_by VARCHAR(150) NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lead_phase3_history_lead_id ON lead_phase3_history(lead_id);

-- ============================================
-- BOOKINGS
-- Created once a lead is Confirmed. One booking per lead.
-- ============================================
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID UNIQUE NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  total_amount NUMERIC(12, 2) NOT NULL,
  advance_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(12, 2) GENERATED ALWAYS AS (total_amount - advance_paid) STORED,
  invoice_number VARCHAR(30) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE SEQUENCE invoice_number_seq START 1001;

CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := 'INV-' || EXTRACT(YEAR FROM NOW()) || '-' || nextval('invoice_number_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_invoice_number
BEFORE INSERT ON bookings
FOR EACH ROW
EXECUTE FUNCTION set_invoice_number();

-- ============================================
-- PAYMENT INSTALLMENTS
-- Each individual payment received against a booking.
-- ============================================
CREATE TABLE payment_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  paid_on DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method VARCHAR(30),         -- Cash, UPI, Bank Transfer, Card, Other
  recorded_by VARCHAR(150) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_installments_booking_id ON payment_installments(booking_id);

-- ============================================
-- ITINERARIES
-- A lead can have multiple itineraries (e.g. "Option A", "Option B")
-- to send different proposals to the customer. Part of Phase 2.
-- ============================================
CREATE TABLE itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,        -- e.g. "5-Day Manali Package"
  created_by VARCHAR(150) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Trip summary / overview
  duration VARCHAR(100),             -- e.g. "5 nights / 6 Days"
  highlights TEXT,
  departure_date DATE,
  arrival_date DATE,
  adults INTEGER NOT NULL DEFAULT 1,
  children INTEGER NOT NULL DEFAULT 0,
  total_rooms INTEGER NOT NULL DEFAULT 1,

  -- "If you want" optional sections — each has a toggle + its own text body
  show_inclusions BOOLEAN NOT NULL DEFAULT TRUE,
  inclusions_text TEXT,
  show_exclusions BOOLEAN NOT NULL DEFAULT TRUE,
  exclusions_text TEXT,
  show_payment_policy BOOLEAN NOT NULL DEFAULT FALSE,
  payment_policy_text TEXT,
  show_cancellation_policy BOOLEAN NOT NULL DEFAULT FALSE,
  cancellation_policy_text TEXT,
  show_terms BOOLEAN NOT NULL DEFAULT FALSE,
  terms_text TEXT,
  show_note BOOLEAN NOT NULL DEFAULT FALSE,
  note_text TEXT,

  tour_cost VARCHAR(200),             -- free text, e.g. "2,36,000/- for All Members"
  cover_image_url VARCHAR(500)        -- optional custom cover photo for the PDF
);

CREATE INDEX idx_itineraries_lead_id ON itineraries(lead_id);

CREATE TRIGGER trg_itineraries_updated_at
BEFORE UPDATE ON itineraries
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ============================================
-- ITINERARY DAYS
-- Each itinerary has multiple days, freely added/removed/reordered.
-- A day is just a title + free-text description in the current builder;
-- the legacy meal/hotel columns are kept for backward compatibility with
-- itineraries created before this format existed.
-- ============================================
CREATE TABLE itinerary_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,        -- 1, 2, 3... display order
  day_date DATE,
  title VARCHAR(255),                 -- e.g. "Friday, October 9th, 2026"
  description TEXT,                   -- free-text day plan
  location VARCHAR(200),
  activities TEXT,
  breakfast BOOLEAN NOT NULL DEFAULT FALSE,
  lunch BOOLEAN NOT NULL DEFAULT FALSE,
  dinner BOOLEAN NOT NULL DEFAULT FALSE,
  hotel_stay VARCHAR(200),
  notes TEXT
);

CREATE INDEX idx_itinerary_days_itinerary_id ON itinerary_days(itinerary_id);

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

-- ============================================
-- SEED DATA — starter employees & vendors
-- ============================================
INSERT INTO employees (name) VALUES
  ('Priya Sharma'),
  ('Rahul Verma'),
  ('Anjali Mehta'),
  ('Karan Singh');

INSERT INTO vendors (name) VALUES
  ('Himalaya Holidays'),
  ('Wanderlust Travels'),
  ('Gulf Tours');
