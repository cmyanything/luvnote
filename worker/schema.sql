CREATE TABLE IF NOT EXISTS cards (
  id         TEXT PRIMARY KEY,
  t          TEXT NOT NULL,
  to_name    TEXT NOT NULL,
  msg        TEXT NOT NULL,
  from_name  TEXT NOT NULL,
  secret     TEXT,
  img        TEXT,
  created_at INTEGER NOT NULL
);
