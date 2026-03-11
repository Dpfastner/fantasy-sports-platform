-- Migration 042: ESPN API health monitoring table
-- Tracks API response health for early warning of ESPN changes

CREATE TABLE IF NOT EXISTS espn_api_health (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint text NOT NULL,
  status_code int,
  response_time_ms int,
  structure_valid boolean NOT NULL DEFAULT true,
  structure_hash text,
  issues text[] DEFAULT '{}',
  checked_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_espn_health_endpoint_time ON espn_api_health(endpoint, checked_at DESC);
