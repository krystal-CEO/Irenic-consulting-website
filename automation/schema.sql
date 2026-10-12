-- Consulting-only inquiry log. Safe to execute again; never drops existing records.
CREATE TABLE IF NOT EXISTS consulting_inquiries (
  id TEXT PRIMARY KEY NOT NULL,
  received_at TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  organization TEXT NOT NULL,
  role TEXT NOT NULL,
  service TEXT NOT NULL,
  team_size TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  goals TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  lead_status TEXT NOT NULL DEFAULT 'New' CHECK (lead_status IN ('New','Reviewing','Contacted','Proposal','Won','Closed')),
  follow_up_date TEXT,
  notes TEXT NOT NULL DEFAULT '',
  notification_state TEXT NOT NULL DEFAULT 'queued' CHECK (notification_state IN ('queued','sending','sent','failed')),
  notification_attempts INTEGER NOT NULL DEFAULT 0,
  notification_message_id TEXT,
  notification_error TEXT
);
CREATE INDEX IF NOT EXISTS consulting_pending_notifications ON consulting_inquiries(notification_state, received_at);
