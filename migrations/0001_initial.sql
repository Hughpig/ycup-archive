PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS seasons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  k REAL NOT NULL DEFAULT 0.16666666666666666,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

INSERT OR IGNORE INTO seasons (id, name, k) VALUES (1, '2026', 0.16666666666666666);

CREATE TABLE IF NOT EXISTS persons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT UNIQUE,
  display_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female')),
  class_name TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS season_teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id INTEGER NOT NULL REFERENCES seasons(id),
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  UNIQUE (season_id, name)
);

CREATE TABLE IF NOT EXISTS season_team_members (
  season_team_id INTEGER NOT NULL REFERENCES season_teams(id) ON DELETE CASCADE,
  person_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  PRIMARY KEY (season_team_id, person_id)
);

CREATE TABLE IF NOT EXISTS contests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id INTEGER NOT NULL REFERENCES seasons(id),
  stage_no INTEGER,
  title TEXT,
  scheduled_start_at INTEGER NOT NULL,
  scheduled_end_at INTEGER NOT NULL,
  problem_count INTEGER NOT NULL DEFAULT 10,
  ratings_finalized_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  UNIQUE (season_id, scheduled_start_at)
);

CREATE INDEX IF NOT EXISTS idx_contests_start ON contests(scheduled_start_at);
CREATE INDEX IF NOT EXISTS idx_contests_season_start ON contests(season_id, scheduled_start_at);

CREATE TABLE IF NOT EXISTS contest_teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contest_id INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  season_team_id INTEGER REFERENCES season_teams(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  UNIQUE (contest_id, name)
);

CREATE INDEX IF NOT EXISTS idx_contest_teams_contest ON contest_teams(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_teams_season_team ON contest_teams(season_team_id);

CREATE TABLE IF NOT EXISTS contest_team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contest_id INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  contest_team_id INTEGER NOT NULL REFERENCES contest_teams(id) ON DELETE CASCADE,
  person_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  attendance_valid INTEGER NOT NULL DEFAULT 1,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'setter')),
  perf_override REAL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  UNIQUE (contest_id, person_id),
  UNIQUE (contest_team_id, person_id)
);

CREATE INDEX IF NOT EXISTS idx_members_contest_person ON contest_team_members(contest_id, person_id);
CREATE INDEX IF NOT EXISTS idx_members_team ON contest_team_members(contest_team_id);

CREATE TABLE IF NOT EXISTS contest_setters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contest_id INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  person_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  leaked INTEGER NOT NULL DEFAULT 0,
  negotiated_perf REAL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  UNIQUE (contest_id, person_id)
);

CREATE INDEX IF NOT EXISTS idx_setters_contest ON contest_setters(contest_id);

CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contest_id INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  contest_team_id INTEGER NOT NULL REFERENCES contest_teams(id) ON DELETE CASCADE,
  problem_index INTEGER NOT NULL CHECK (problem_index BETWEEN 1 AND 13),
  verdict TEXT NOT NULL CHECK (verdict IN ('correct', 'wrong', 'pending')),
  submitted_at INTEGER NOT NULL,
  effective_minute INTEGER NOT NULL DEFAULT 0,
  operator TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  voided INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_submissions_contest_team ON submissions(contest_id, contest_team_id);
CREATE INDEX IF NOT EXISTS idx_submissions_problem ON submissions(contest_id, contest_team_id, problem_index, voided);
CREATE INDEX IF NOT EXISTS idx_submissions_verdict ON submissions(contest_id, contest_team_id, problem_index, verdict, voided);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT,
  body_json TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

CREATE TABLE IF NOT EXISTS person_contest_perfs (
  person_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  contest_id INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  perf REAL NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('team_rank', 'setter_negotiated', 'leak_penalty')),
  finalized_at INTEGER NOT NULL,
  PRIMARY KEY (person_id, contest_id)
);

CREATE INDEX IF NOT EXISTS idx_perfs_contest ON person_contest_perfs(contest_id);

CREATE TABLE IF NOT EXISTS person_ratings (
  season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  person_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  rating REAL NOT NULL,
  contest_count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (season_id, person_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_season_value ON person_ratings(season_id, rating DESC);
