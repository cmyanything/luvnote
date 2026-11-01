// LuvNote Media API V3: private R2 images with short-lived guest upload capabilities.
// Existing V1/V2 cards stay in D1 and remain readable.
const DAY = 86400000;
const SESSION_MS = 30 * 60 * 1000;
const MAX_JPEG = 1_500_000;
const THEMES = new Set(["pink-coquette", "coquette-dream", "little-memories", "birthday-chat", "velvet-gift"]);
const SID = /^[0-9a-f-]{36}$/;
const ASSET = /^[0-9a-f-]{36}$/;
const CARD = /^[a-z0-9]{7}$/;

function hex(bytes) {
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}
function randomSecret() {
  return hex(crypto.getRandomValues(new Uint8Array(32)));
}
async function tokenHash(token) {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))));
}
function bearer(req) {
  const match = /^Bearer ([0-9a-f]{64})$/.exec(req.headers.get("Authorization") || "");
  return match && match[1];
}
async function sessionFor(req, env, sid) {
  const token = bearer(req);
  if (!SID.test(sid) || !token) return null;
  const digest = await tokenHash(token);
  return env.DB.prepare(
    "SELECT id FROM media_upload_sessions WHERE id = ? AND token_hash = ? AND expires_at > ? AND used_at IS NULL"
  ).bind(sid, digest, Date.now()).first();
}
function jpegBytes(buffer) {
  const b = new Uint8Array(buffer);
  if (b.length < 32 || b.length > MAX_JPEG) return false;
  if (b[0] !== 255 || b[1] !== 216 || b[2] !== 255 || b[b.length-2] !== 255 || b[b.length-1] !== 217) return false;
  // Reject EXIF GPS metadata; official UI re-encodes via Canvas as well.
  for (let i = 0; i < Math.min(b.length - 6, 131072); i++) {
    if (b[i] === 69 && b[i+1] === 120 && b[i+2] === 105 && b[i+3] === 102 && b[i+4] === 0 && b[i+5] === 0) return false;
  }
  return true;
}
async function checkTurnstile(req, env, token) {
  if (!env.TURNSTILE_SECRET_KEY || typeof token !== "string" || token.length > 2048 || !token) return false;
  const form = new FormData();
  form.set("secret", env.TURNSTILE_SECRET_KEY);
  form.set("response", token);
  const ip = req.headers.get("CF-Connecting-IP");
  if (ip) form.set("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST", body: form, signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) return false;
  const verified = await res.json();
  const hosts = (env.TURNSTILE_HOSTNAMES || "luvnote.fun,www.luvnote.fun,cmyanything.github.io")
    .split(",").map(h => h.trim()).filter(Boolean);
  return verified.success === true && verified.action === "luvnote_media_upload" &&
    hosts.includes(verified.hostname);
}
async function startSession(req, env, json) {
  if (!env.TURNSTILE_SECRET_KEY) return json(req, { error: "turnstile_not_configured" }, 503);
  const raw = await req.text();
  if (raw.length > 4096) return json(req, { error: "too_large" }, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return json(req, { error: "bad_json" }, 400); }
  let valid = false;
  try { valid = await checkTurnstile(req, env, body.turnstileToken); } catch { /* fail closed */ }
  if (!valid) return json(req, { error: "verification_failed" }, 403);
  const id = crypto.randomUUID();
  const secret = randomSecret();
  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO media_upload_sessions (id,token_hash,created_at,expires_at,photo_count,cover_count) VALUES (?,?,?,?,0,0)"
  ).bind(id, await tokenHash(secret), now, now + SESSION_MS).run();
  return json(req, { sessionId: id, uploadToken: secret, expires: now + SESSION_MS }, 201,
    { "Cache-Control": "no-store" });
}
async function uploadPhoto(req, env, url, sid, json) {
  const kind = url.searchParams.get("kind");
  if (kind !== "photo" && kind !== "cover") return json(req, { error: "bad_kind" }, 400);
  if (!await sessionFor(req, env, sid)) return json(req, { error: "session_invalid" }, 403);
  if ((req.headers.get("Content-Type") || "").toLowerCase() !== "image/jpeg")
    return json(req, { error: "jpeg_only" }, 415);
  const hinted = Number(req.headers.get("Content-Length") || 0);
  if (hinted > MAX_JPEG) return json(req, { error: "too_large" }, 413);
  const bytes = await req.arrayBuffer();
  if (!jpegBytes(bytes)) return json(req, { error: "invalid_jpeg" }, 400);
  const field = kind === "photo" ? "photo_count" : "cover_count";
  const max = kind === "photo" ? 5 : 1;
  const token = bearer(req);
  const reserved = await env.DB.prepare(
    "UPDATE media_upload_sessions SET " + field + " = " + field +
    " + 1 WHERE id = ? AND token_hash = ? AND expires_at > ? AND used_at IS NULL AND " +
    field + " < ? RETURNING id"
  ).bind(sid, await tokenHash(token), Date.now(), max).first();
  if (!reserved) return json(req, { error: "upload_limit_reached" }, 409);
  const id = crypto.randomUUID();
  const key = "v3/" + sid + "/" + id + ".jpg";
  try {
    await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: "image/jpeg" } });
    await env.DB.prepare(
      "INSERT INTO media_assets (id,session_id,object_key,kind,size,created_at) VALUES (?,?,?,?,?,?)"
    ).bind(id, sid, key, kind, bytes.byteLength, Date.now()).run();
  } catch (err) {
    try { await env.MEDIA.delete(key); } catch { /* cleanup will need operator attention */ }
    await env.DB.prepare("UPDATE media_upload_sessions SET " + field + " = MAX(0," + field + "-1) WHERE id=?")
      .bind(sid).run();
    throw err;
  }
  return json(req, { id }, 201, { "Cache-Control": "no-store" });
}
async function publishCard(req, env, json, cleanV2, newId) {
  const raw = await req.text();
  if (raw.length > 50000) return json(req, { error: "too_large" }, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return json(req, { error: "bad_json" }, 400); }
  const { sessionId: sid, theme } = body || {};
  if (!SID.test(sid || "") || !THEMES.has(theme))
    return json(req, { error: "bad_request" }, 400);
  if (!await sessionFor(req, env, sid)) return json(req, { error: "session_invalid" }, 403);
  const rawData = body.data || {};
  if (typeof rawData !== "object" || Array.isArray(rawData)) return json(req, { error: "bad_data" }, 400);
  const photos = Array.isArray(rawData.photos) ? rawData.photos : [];
  const coverId = rawData.cover_id || null;
  if (photos.length > 5 || (coverId && !ASSET.test(coverId))) return json(req, { error: "bad_media" }, 400);
  const photoIds = [];
  const cleanPhotos = [];
  for (const p of photos) {
    if (!p || !ASSET.test(p.id || "")) return json(req, { error: "bad_media" }, 400);
    photoIds.push(p.id);
    cleanPhotos.push({ id: p.id, cap: typeof p.cap === "string" ? p.cap.slice(0, 40) : "" });
  }
  const all = [...photoIds, ...(coverId ? [coverId] : [])];
  if (new Set(all).size !== all.length) return json(req, { error: "duplicate_media" }, 400);
  for (const id of all) {
    const asset = await env.DB.prepare(
      "SELECT kind FROM media_assets WHERE id=? AND session_id=? AND card_id IS NULL"
    ).bind(id, sid).first();
    if (!asset || asset.kind !== (id === coverId ? "cover" : "photo"))
      return json(req, { error: "invalid_media_reference" }, 400);
  }
  const safe = cleanV2({ ...rawData, photos: [], cover: null });
  if (!safe.to || !safe.from || !safe.letter) return json(req, { error: "missing" }, 400);
  const data = { ...safe, media_version: 3, photos: cleanPhotos };
  if (coverId) data.cover_id = coverId;
  const now = Date.now(), expires = now + 15 * DAY;
  for (let attempt = 0; attempt < 5; attempt++) {
    const cardId = newId();
    try {
      const statements = [
        env.DB.prepare(
          "INSERT INTO theme_cards (id,theme,data,created_at,expires_at) SELECT ?,?,?,?,? " +
          "WHERE EXISTS (SELECT 1 FROM media_upload_sessions WHERE id=? AND used_at IS NULL AND expires_at>?)"
        ).bind(cardId, theme, JSON.stringify(data), now, expires, sid, now),
        ...all.map(assetId => env.DB.prepare(
          "UPDATE media_assets SET card_id=?,expires_at=? WHERE id=? AND session_id=? AND card_id IS NULL"
        ).bind(cardId, expires, assetId, sid)),
        env.DB.prepare(
          "UPDATE media_upload_sessions SET used_at=? WHERE id=? AND used_at IS NULL"
        ).bind(now, sid)
      ];
      const result = await env.DB.batch(statements);
      if (result[0]?.meta?.changes !== 1) return json(req, { error: "session_used" }, 409);
      return json(req, { id: cardId, expires }, 201, { "Cache-Control": "no-store" });
    } catch (err) {
      if (!String(err?.message || err).includes("UNIQUE")) throw err;
    }
  }
  return json(req, { error: "id_collision" }, 500);
}
export function materializeV3Card(data, cardId, origin) {
  if (data?.media_version !== 3) return data;
  const mediaUrl = id => origin + "/v3/cards/" + cardId + "/media/" + id;
  const photos = (Array.isArray(data.photos) ? data.photos : []).map(p => ({
    src: mediaUrl(p.id), cap: p.cap || ""
  }));
  const result = { ...data, photos };
  if (data.cover_id) result.cover = mediaUrl(data.cover_id);
  delete result.cover_id;
  delete result.media_version;
  return result;
}
async function showMedia(req, env, cardId, assetId, cors) {
  const now = Date.now();
  const row = await env.DB.prepare(
    "SELECT m.object_key FROM media_assets m JOIN theme_cards c ON m.card_id=c.id " +
    "WHERE c.id=? AND m.id=? AND c.expires_at>? AND m.expires_at>? "
  ).bind(cardId, assetId, now, now).first();
  if (!row) return new Response("Not found", { status: 404, headers: cors(req) });
  const object = await env.MEDIA.get(row.object_key);
  if (!object || !object.body) return new Response("Not found", { status: 404, headers: cors(req) });
  return new Response(object.body, {
    status: 200, headers: {
      ...cors(req), "Content-Type": "image/jpeg", "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'", "Cache-Control": "private, no-store"
    }
  });
}
export async function handleMediaV3(req, env, url, helpers) {
  if (!url.pathname.startsWith("/v3/")) return null;
  const { json, cors, cleanV2, newId } = helpers;
  if (!env.MEDIA) return json(req, { error: "media_storage_unavailable" }, 503);
  if (url.pathname === "/v3/upload-sessions" && req.method === "POST")
    return startSession(req, env, json);
  const upload = /^\/v3\/upload-sessions\/([0-9a-f-]{36})\/media$/.exec(url.pathname);
  if (upload && req.method === "POST") return uploadPhoto(req, env, url, upload[1], json);
  if (url.pathname === "/v3/cards" && req.method === "POST")
    return publishCard(req, env, json, cleanV2, newId);
  const media = /^\/v3\/cards\/([a-z0-9]{7})\/media\/([0-9a-f-]{36})$/.exec(url.pathname);
  if (media && req.method === "GET" && CARD.test(media[1]) && ASSET.test(media[2]))
    return showMedia(req, env, media[1], media[2], cors);
  return json(req, { error: "not_found" }, 404);
}
export async function cleanupMediaV3(env) {
  if (!env.MEDIA || !env.DB) return;
  const now = Date.now();
  // Delete expired published media and orphaned uploads, retrying failures on next run.
  const rows = await env.DB.prepare(
    "SELECT m.id,m.object_key FROM media_assets m " +
    "LEFT JOIN media_upload_sessions s ON s.id=m.session_id " +
    "WHERE (m.card_id IS NULL AND s.expires_at < ?) OR (m.card_id IS NOT NULL AND m.expires_at < ?) LIMIT 100"
  ).bind(now, now).all();
  for (const row of rows.results || []) {
    await env.MEDIA.delete(row.object_key);
    await env.DB.prepare("DELETE FROM media_assets WHERE id=?").bind(row.id).run();
  }
  await env.DB.prepare(
    "DELETE FROM media_upload_sessions WHERE expires_at < ? " +
    "AND NOT EXISTS (SELECT 1 FROM media_assets WHERE session_id=media_upload_sessions.id)"
  ).bind(now).run();
  await env.DB.prepare(
    "DELETE FROM theme_cards WHERE expires_at < ? AND json_extract(data,'$.media_version')=3 " +
    "AND NOT EXISTS (SELECT 1 FROM media_assets WHERE card_id=theme_cards.id)"
  ).bind(now).run();
}
