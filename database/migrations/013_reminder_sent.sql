-- Add reminder_sent flag to live_sessions for idempotent scheduler
ALTER TABLE live_sessions
    ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_live_sessions_reminder
    ON live_sessions (status, reminder_sent, scheduled_at)
    WHERE status = 'scheduled' AND reminder_sent = false;
