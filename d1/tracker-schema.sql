-- D1 schema for the case-tracker crowdsourcing feature (TRACKER-PLAN.md 第三节).
-- Apply once: wrangler d1 execute gctracker --remote --file=d1/tracker-schema.sql
-- Local dev copy: wrangler d1 execute gctracker --local --file=d1/tracker-schema.sql

CREATE TABLE IF NOT EXISTS cases (
  id            TEXT PRIMARY KEY,
  owner_id      TEXT NOT NULL,
  cat           TEXT NOT NULL,
  country       TEXT NOT NULL,
  priority_date TEXT NOT NULL,
  path          TEXT NOT NULL,
  center        TEXT NOT NULL,
  d_filed       TEXT,
  d_receipt     TEXT,
  d_bio         TEXT,
  d_int_sched   TEXT,
  d_interview   TEXT,
  d_approved    TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  ip_hash       TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cases_owner ON cases(owner_id);
CREATE INDEX IF NOT EXISTS idx_cases_cat_country ON cases(cat, country);
