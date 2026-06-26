-- Migration: Add Phase 3 fields (Margin, Client Review, Close Status)
-- Run this in pgAdmin 4 Query Tool on your existing database.

ALTER TABLE leads ADD COLUMN margin_amount NUMERIC(12, 2);
ALTER TABLE leads ADD COLUMN review_rating INTEGER CHECK (review_rating BETWEEN 1 AND 5);
ALTER TABLE leads ADD COLUMN review_comment TEXT;
ALTER TABLE leads ADD COLUMN close_status VARCHAR(20) NOT NULL DEFAULT 'Not Closed';
-- close_status values: 'Not Closed', 'Closed - Won', 'Closed - Lost'

CREATE TABLE lead_phase3_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  changed_by VARCHAR(150) NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lead_phase3_history_lead_id ON lead_phase3_history(lead_id);