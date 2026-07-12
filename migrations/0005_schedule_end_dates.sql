ALTER TABLE schedules ADD COLUMN ends_at TEXT;

CREATE INDEX IF NOT EXISTS idx_schedules_ends_at ON schedules (ends_at);
