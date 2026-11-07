-- Test-only simulated email delivery. No real learners or credential messages.
CREATE TABLE IF NOT EXISTS academy_dev_outbox (
  id TEXT PRIMARY KEY,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  received_at TEXT NOT NULL
);
