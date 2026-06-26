-- Migration: Add Phase tracking + mandatory notes on status/assignment/trip-detail changes
-- Run this in pgAdmin 4 Query Tool on your existing database.

-- ============================================
-- PHASE TRACKING
-- current_phase: 1 = Lead Generation, 2 = Vendor + Itinerary
-- ============================================
ALTER TABLE leads ADD COLUMN current_phase INTEGER NOT NULL DEFAULT 1;
CREATE INDEX idx_leads_current_phase ON leads(current_phase);

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
-- MANDATORY NOTE on status changes, reassignments, and trip-detail edits
-- (note is attached directly to the history entry, not the general notes log)
-- ============================================
ALTER TABLE lead_status_history ADD COLUMN note TEXT NOT NULL DEFAULT '';
ALTER TABLE lead_assignment_history ADD COLUMN note TEXT NOT NULL DEFAULT '';

-- Trip-detail edits didn't have a history table before — adding one now.
CREATE TABLE lead_trip_detail_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  changed_by VARCHAR(150) NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lead_trip_detail_history_lead_id ON lead_trip_detail_history(lead_id);

-- Remove the DEFAULT '' now that old rows are backfilled, so future inserts
-- are forced to supply a real note (defense in depth — the API also validates this).
ALTER TABLE lead_status_history ALTER COLUMN note DROP DEFAULT;
ALTER TABLE lead_assignment_history ALTER COLUMN note DROP DEFAULT;
