-- Migration: Add Payment Installments
-- Run this in pgAdmin 4 Query Tool on your existing database.

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
