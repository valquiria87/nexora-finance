-- Migration: Create webhook_events table for Pluggy webhook persistence and idempotency
-- Version: 20261028120000

CREATE TABLE IF NOT EXISTS webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  item_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed', 'ignored')),
  attempts INTEGER NOT NULL DEFAULT 1,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  processed_at TIMESTAMPTZ
);

-- Index for querying and filtering by item_id
CREATE INDEX IF NOT EXISTS idx_webhook_events_item_id ON webhook_events(item_id);

-- Index for querying events by processing status
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);

-- Enable Row Level Security (RLS)
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Note: No public policy is granted. Access is restricted to the service_role key.
COMMENT ON TABLE webhook_events IS 'Stores incoming Pluggy webhook notifications for atomic deduplication, processing lifecycle, and retry tracking.';
