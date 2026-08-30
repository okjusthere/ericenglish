PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS learner_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  working_cefr TEXT NOT NULL,
  target_cefr TEXT NOT NULL,
  support_language TEXT NOT NULL,
  daily_minutes INTEGER NOT NULL DEFAULT 60,
  weekly_days INTEGER NOT NULL DEFAULT 5,
  goals_json TEXT NOT NULL DEFAULT '[]',
  strengths_json TEXT NOT NULL DEFAULT '[]',
  weaknesses_json TEXT NOT NULL DEFAULT '[]',
  scaffolding_level INTEGER NOT NULL DEFAULT 2,
  assessment_completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS learning_units (
  id TEXT PRIMARY KEY,
  unit_type TEXT NOT NULL,
  term TEXT NOT NULL,
  normalized_term TEXT NOT NULL UNIQUE,
  lemma TEXT,
  part_of_speech TEXT,
  ipa TEXT,
  cefr TEXT NOT NULL,
  priority REAL NOT NULL DEFAULT 0.5,
  register TEXT NOT NULL,
  domains_json TEXT NOT NULL,
  definition_en TEXT NOT NULL,
  definition_zh TEXT,
  collocations_json TEXT NOT NULL,
  examples_json TEXT NOT NULL,
  confusions_json TEXT NOT NULL,
  source TEXT NOT NULL,
  content_version INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_units_cefr_priority ON learning_units(cefr, priority DESC);
CREATE INDEX IF NOT EXISTS idx_units_source_active ON learning_units(source, active);

CREATE TABLE IF NOT EXISTS user_unit_states (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit_id TEXT NOT NULL REFERENCES learning_units(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'unseen',
  recognition_score REAL NOT NULL DEFAULT 0,
  recall_score REAL NOT NULL DEFAULT 0,
  production_score REAL NOT NULL DEFAULT 0,
  transfer_score REAL NOT NULL DEFAULT 0,
  exposures INTEGER NOT NULL DEFAULT 0,
  correct_reviews INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  successful_free_uses INTEGER NOT NULL DEFAULT 0,
  successful_real_world_uses INTEGER NOT NULL DEFAULT 0,
  avg_response_ms REAL NOT NULL DEFAULT 0,
  last_seen_at TEXT,
  last_success_at TEXT,
  priority_override REAL,
  suspended INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id, unit_id)
);

CREATE TABLE IF NOT EXISTS review_cards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit_id TEXT NOT NULL REFERENCES learning_units(id) ON DELETE CASCADE,
  card_type TEXT NOT NULL,
  state INTEGER NOT NULL DEFAULT 0,
  due_at TEXT NOT NULL,
  stability REAL NOT NULL DEFAULT 0,
  difficulty REAL NOT NULL DEFAULT 0,
  elapsed_days INTEGER NOT NULL DEFAULT 0,
  scheduled_days INTEGER NOT NULL DEFAULT 0,
  learning_steps INTEGER NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  last_review_at TEXT,
  fsrs_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, unit_id, card_type)
);
CREATE INDEX IF NOT EXISTS idx_review_due ON review_cards(user_id, due_at, state);

CREATE TABLE IF NOT EXISTS review_events (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES review_cards(id) ON DELETE CASCADE,
  unit_id TEXT NOT NULL REFERENCES learning_units(id) ON DELETE CASCADE,
  reviewed_at TEXT NOT NULL,
  rating INTEGER NOT NULL,
  suggested_rating INTEGER NOT NULL,
  correct INTEGER NOT NULL,
  response_text TEXT,
  response_ms INTEGER NOT NULL,
  hint_level INTEGER NOT NULL DEFAULT 0,
  source_session_id TEXT,
  previous_state_json TEXT NOT NULL,
  next_state_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_review_events_date ON review_events(reviewed_at);

CREATE TABLE IF NOT EXISTS missions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_date TEXT NOT NULL,
  mission_text TEXT NOT NULL,
  target_units_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  actual_usage TEXT,
  reflection TEXT,
  naturalness INTEGER,
  completed_at TEXT,
  UNIQUE(user_id, local_date)
);

CREATE TABLE IF NOT EXISTS daily_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_date TEXT NOT NULL,
  target_minutes INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready',
  focus_summary TEXT NOT NULL,
  target_units_json TEXT NOT NULL,
  mission_id TEXT REFERENCES missions(id),
  generated_reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  UNIQUE(user_id, local_date)
);

CREATE TABLE IF NOT EXISTS daily_plan_items (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES daily_plans(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  estimated_minutes INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payload_json TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  result_json TEXT,
  UNIQUE(plan_id, sequence)
);

CREATE TABLE IF NOT EXISTS scenarios (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  domain TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  ai_role TEXT NOT NULL,
  user_objective TEXT NOT NULL,
  target_units_json TEXT NOT NULL,
  hidden_complication TEXT NOT NULL,
  max_turns INTEGER NOT NULL,
  rubric_json TEXT NOT NULL,
  completion_condition TEXT NOT NULL,
  source TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS practice_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'fluency',
  scenario_id TEXT REFERENCES scenarios(id),
  plan_item_id TEXT REFERENCES daily_plan_items(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  objective_metrics_json TEXT NOT NULL DEFAULT '{}',
  evaluation_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_history ON practice_sessions(user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS practice_turns (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  turn_index INTEGER NOT NULL,
  speaker TEXT NOT NULL,
  text TEXT NOT NULL,
  audio_object_key TEXT,
  duration_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, turn_index)
);

CREATE TABLE IF NOT EXISTS writing_submissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  prompt TEXT NOT NULL,
  original_text TEXT NOT NULL,
  corrected_text TEXT NOT NULL,
  natural_text TEXT NOT NULL,
  polished_text TEXT NOT NULL,
  evaluation_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feedback_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  original_text TEXT NOT NULL,
  improved_text TEXT NOT NULL,
  explanation TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS error_patterns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  normalized_pattern TEXT NOT NULL,
  description TEXT NOT NULL,
  count_total INTEGER NOT NULL DEFAULT 1,
  count_30d INTEGER NOT NULL DEFAULT 1,
  impact_score REAL NOT NULL DEFAULT 0.5,
  examples_json TEXT NOT NULL,
  trend_json TEXT NOT NULL DEFAULT '[]',
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  micro_lesson_generated_at TEXT,
  UNIQUE(user_id, category, normalized_pattern)
);
CREATE INDEX IF NOT EXISTS idx_errors_recent ON error_patterns(user_id, count_30d DESC, impact_score DESC);

CREATE TABLE IF NOT EXISTS real_world_captures (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  capture_type TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  redacted_text TEXT NOT NULL,
  context TEXT NOT NULL,
  extracted_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_preps (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_text TEXT NOT NULL,
  prep_json TEXT NOT NULL,
  after_action_json TEXT,
  status TEXT NOT NULL DEFAULT 'prepared',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assessment_type TEXT NOT NULL,
  version INTEGER NOT NULL,
  current_section TEXT NOT NULL DEFAULT 'receptive',
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  objective_scores_json TEXT NOT NULL DEFAULT '{}',
  evaluator_scores_json TEXT NOT NULL DEFAULT '{}',
  working_cefr TEXT,
  report_json TEXT
);

CREATE TABLE IF NOT EXISTS assessment_responses (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  section TEXT NOT NULL,
  response_text TEXT,
  audio_object_key TEXT,
  correct INTEGER,
  response_ms INTEGER NOT NULL DEFAULT 0,
  replay_count INTEGER NOT NULL DEFAULT 0,
  hint_level INTEGER NOT NULL DEFAULT 0,
  evaluation_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS weekly_reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start TEXT NOT NULL,
  week_end TEXT NOT NULL,
  metrics_json TEXT NOT NULL,
  narrative_json TEXT NOT NULL,
  next_week_plan_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, week_start)
);

CREATE TABLE IF NOT EXISTS personal_examples (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit_id TEXT NOT NULL REFERENCES learning_units(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_usage_events (
  id TEXT PRIMARY KEY,
  task_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  latency_ms INTEGER NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  audio_seconds REAL,
  estimated_cost REAL,
  success INTEGER NOT NULL,
  error_code TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_date ON ai_usage_events(created_at, task_type);

CREATE TABLE IF NOT EXISTS api_rate_events (
  id TEXT PRIMARY KEY,
  bucket_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rate_bucket_time ON api_rate_events(bucket_key, created_at);

CREATE TABLE IF NOT EXISTS job_runs (
  id TEXT PRIMARY KEY,
  job_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  result_json TEXT,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS exports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  format TEXT NOT NULL,
  object_key TEXT,
  status TEXT NOT NULL DEFAULT 'complete',
  payload TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT
);
