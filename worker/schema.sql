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

-- Additive journals; persist intent BEFORE writing R2, and receipts for retry safety.
CREATE TABLE IF NOT EXISTS media_upload_jobs (
  asset_id TEXT PRIMARY KEY REFERENCES media_assets(id),
  session_id TEXT NOT NULL REFERENCES media_upload_sessions(id),
  request_key TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('writing','ready','failed')),
  UNIQUE(session_id,request_key)
);
CREATE TABLE IF NOT EXISTS media_publications (
  session_id TEXT PRIMARY KEY REFERENCES media_upload_sessions(id),
  card_id TEXT NOT NULL UNIQUE REFERENCES theme_cards(id),
  payload_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS media_write_budgets (
  budget_key TEXT NOT NULL,
  window_end INTEGER NOT NULL,
  count INTEGER NOT NULL CHECK(count>0),
  PRIMARY KEY(budget_key,window_end)
);
CREATE INDEX IF NOT EXISTS media_assets_by_session ON media_assets(session_id);
CREATE INDEX IF NOT EXISTS media_budgets_expiry ON media_write_budgets(window_end);
CREATE TABLE IF NOT EXISTS media_cleanup_state (
  id TEXT PRIMARY KEY,
  cursor TEXT
);

-- Owner edit capability: SHA-256 of the publishing upload token. Rows are removed with their card.
CREATE TABLE IF NOT EXISTS card_edit_keys (
  card_id TEXT PRIMARY KEY,
  key_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
-- Idempotency receipts for owner edits, one per upload session.
CREATE TABLE IF NOT EXISTS card_edits (
  session_id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS card_edits_by_card ON card_edits(card_id);
