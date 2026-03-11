-- Migration 041: Add manual score override columns to games table
-- Allows admin to manually enter scores when ESPN API is unavailable

ALTER TABLE games ADD COLUMN IF NOT EXISTS is_manual_override boolean NOT NULL DEFAULT false;
ALTER TABLE games ADD COLUMN IF NOT EXISTS manual_override_at timestamptz;
ALTER TABLE games ADD COLUMN IF NOT EXISTS manual_override_by uuid REFERENCES auth.users(id);
