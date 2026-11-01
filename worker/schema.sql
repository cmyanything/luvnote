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

-- V3 private-media upload sessions and R2 references (additive; preserve existing cards).
CREATE TABLE IF NOT EXISTS media_upload_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  photo_count INTEGER NOT NULL DEFAULT 0,
  cover_count INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES media_upload_sessions(id),
  object_key TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK(kind IN ('photo','cover')),
  size INTEGER NOT NULL,
  card_id TEXT REFERENCES theme_cards(id),
  created_at INTEGER NOT NULL,
  expires_at INTEGER
);
CREATE INDEX IF NOT EXISTS media_assets_by_card ON media_assets(card_id);
CREATE INDEX IF NOT EXISTS media_assets_expiry ON media_assets(expires_at);
CREATE INDEX IF NOT EXISTS media_sessions_expiry ON media_upload_sessions(expires_at);
