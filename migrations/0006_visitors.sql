CREATE TABLE IF NOT EXISTS visitors (
  visitor_id TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS daily_visitors (
  day TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  PRIMARY KEY (day, visitor_id)
);
