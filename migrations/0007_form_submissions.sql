-- Website form submissions (enquiry + newsletter), emailed via Cloudflare Email Routing.

CREATE TABLE IF NOT EXISTS form_submissions (
  id TEXT PRIMARY KEY,
  form_type TEXT NOT NULL CHECK (form_type IN ('enquiry', 'newsletter')),
  name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  destination TEXT,
  package TEXT,
  departure_date TEXT,
  travelers TEXT,
  message TEXT,
  payload TEXT,
  emailed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_created ON form_submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_submissions_type ON form_submissions (form_type, created_at DESC);
