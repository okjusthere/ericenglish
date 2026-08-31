CREATE TABLE IF NOT EXISTS realtime_events (
  event_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  text TEXT,
  duration_ms INTEGER,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_realtime_events_session ON realtime_events(session_id, created_at);
