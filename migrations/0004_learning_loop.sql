ALTER TABLE review_cards ADD COLUMN active INTEGER NOT NULL DEFAULT 0;
ALTER TABLE review_cards ADD COLUMN activated_at TEXT;

ALTER TABLE user_unit_states ADD COLUMN last_lapse_at TEXT;

ALTER TABLE assessment_responses ADD COLUMN machine_score REAL;

CREATE TABLE IF NOT EXISTS learning_evidence (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit_id TEXT NOT NULL REFERENCES learning_units(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  dimension TEXT NOT NULL CHECK (dimension IN ('recognition','recall','production','transfer')),
  score REAL NOT NULL CHECK (score >= 0 AND score <= 100),
  verified INTEGER NOT NULL DEFAULT 0,
  response_text TEXT,
  response_ms INTEGER,
  session_id TEXT REFERENCES practice_sessions(id) ON DELETE SET NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_learning_evidence_unit
  ON learning_evidence(user_id, unit_id, dimension, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_evidence_source
  ON learning_evidence(source, created_at DESC);

CREATE TABLE IF NOT EXISTS assessment_items (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  unit_id TEXT REFERENCES learning_units(id) ON DELETE SET NULL,
  section TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  prompt TEXT NOT NULL,
  options_json TEXT NOT NULL DEFAULT '[]',
  expected_answer TEXT,
  cefr TEXT,
  UNIQUE(assessment_id, ordinal)
);
CREATE INDEX IF NOT EXISTS idx_assessment_items_order
  ON assessment_items(assessment_id, ordinal);

CREATE TABLE IF NOT EXISTS retry_attempts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  correction_index INTEGER NOT NULL,
  transcript TEXT NOT NULL,
  audio_object_key TEXT,
  score REAL NOT NULL,
  passed INTEGER NOT NULL,
  feedback TEXT NOT NULL,
  response_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_retry_attempts_session
  ON retry_attempts(session_id, correction_index, created_at DESC);

-- Existing installations created every seed card as immediately due. Keep genuine
-- review history active, but quarantine unseen, never-reviewed cards.
UPDATE review_cards
SET active = CASE
  WHEN reps > 0 OR EXISTS (
    SELECT 1 FROM user_unit_states s
    WHERE s.user_id = review_cards.user_id
      AND s.unit_id = review_cards.unit_id
      AND s.status <> 'unseen'
  ) THEN 1 ELSE 0 END,
activated_at = CASE
  WHEN reps > 0 OR EXISTS (
    SELECT 1 FROM user_unit_states s
    WHERE s.user_id = review_cards.user_id
      AND s.unit_id = review_cards.unit_id
      AND s.status <> 'unseen'
  ) THEN CURRENT_TIMESTAMP ELSE NULL END;
