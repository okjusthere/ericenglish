ALTER TABLE assessment_items ADD COLUMN required INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_assessment_items_adaptive
  ON assessment_items(assessment_id, required, cefr, section);
