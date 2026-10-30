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

CREATE TABLE IF NOT EXISTS theme_cards (
  id         TEXT PRIMARY KEY,
  theme      TEXT NOT NULL,
  data       TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
