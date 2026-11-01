import { readLimitedBody, readJson, digest, reserveBudget } from './guards.js';
import { validateJpeg } from './jpeg.js';
// LuvNote Media API V3: private R2 images with short-lived guest upload capabilities.
// Existing V1/V2 cards stay in D1 and remain readable.
const DAY = 86400000;
const SESSION_MS = 30 * 60 * 1000;
const MAX_JPEG = 1_500_000;
const THEMES = new Set(["pink-coquette", "coquette-dream", "little-memories", "birthday-chat", "velvet-gift"]);
const SID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ASSET = SID;
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
async function sessionFor(req, env, sid, allowUsed = false) {
  const token = bearer(req);
  if (!SID.test(sid) || !token) return null;
  const digest = await tokenHash(token);
  return env.DB.prepare(
    "SELECT id,used_at FROM media_upload_sessions WHERE id = ? AND token_hash = ? AND expires_at > ?" + (allowUsed ? "" : " AND used_at IS NULL")
  ).bind(sid, digest, Date.now()).first();
}
async function checkTurnstile(req, env, token) {
  if (!env.TURNSTILE_SECRET_KEY || typeof token !== "string" || token.length > 2048 || !token) return false;
  const host = new URL(req.url).hostname;
  const stagingHost = /^luvnote-api-staging\.[a-z0-9-]+\.workers\.dev$/.test(host) || ['localhost','127.0.0.1'].includes(host);
  const testSecret = /^[123]x0+[AB]{2}$/.test(env.TURNSTILE_SECRET_KEY);
  if ((testSecret || env.TURNSTILE_TEST_MODE === 'true') && !(env.ENVIRONMENT === 'staging' && stagingHost)) return false;
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
  const isolatedTest = env.ENVIRONMENT === "staging" &&
    stagingHost && token === 'XXXX.DUMMY.TOKEN.XXXX' &&
    env.TURNSTILE_TEST_MODE === "true" &&
    env.TURNSTILE_SECRET_KEY === "1x0000000000000000000000000000000AA" &&
    [undefined,'test'].includes(verified.action) && ['localhost','127.0.0.1','example.com'].includes(verified.hostname);
  return verified.success === true &&
    (isolatedTest || (verified.action === "luvnote_media_upload" && hosts.includes(verified.hostname)));
}
async function startSession(req, env, json) {
  const body = await readJson(req, 4096);
  if (!env.TURNSTILE_SECRET_KEY) return json(req, { error: "turnstile_not_configured" }, 503);
  let valid = false;
  try { valid = await checkTurnstile(req, env, body.turnstileToken); } catch { /* fail closed */ }
  if (!valid) return json(req, { error: "verification_failed" }, 403);
  const ip = await digest(req.headers.get('CF-Connecting-IP') || 'unknown');
  if (!await reserveBudget(env, 'session:' + ip, 5, 3600000) ||
      !await reserveBudget(env, 'sessions:global', 100, DAY))
    return json(req, { error: 'quota_exceeded' }, 429, { 'Retry-After': '3600' });
  const id = crypto.randomUUID(), secret = randomSecret(), now = Date.now();
  await env.DB.prepare(
    "INSERT INTO media_upload_sessions (id,token_hash,created_at,expires_at,photo_count,cover_count) VALUES (?,?,?,?,0,0)"
  ).bind(id, await tokenHash(secret), now, now + SESSION_MS).run();
  return json(req, { sessionId: id, uploadToken: secret, expires: now + SESSION_MS }, 201,
    { "Cache-Control": "no-store" });
}
async function uploadPhoto(req, env, url, sid, json) {
  const kind = url.searchParams.get("kind"), requestKey = req.headers.get('Idempotency-Key') || '';
  if (kind !== "photo" && kind !== "cover") return json(req, { error: "bad_kind" }, 400);
  if (!SID.test(requestKey)) return json(req, { error: 'idempotency_key_required' }, 400);
  if (!await sessionFor(req, env, sid)) return json(req, { error: "session_invalid" }, 403);
  if ((req.headers.get("Content-Type") || "").toLowerCase() !== "image/jpeg")
    return json(req, { error: "jpeg_only" }, 415);
  const raw = await readLimitedBody(req, MAX_JPEG);
  if (raw === null) return json(req, { error: "too_large" }, 413);
  const bytes = validateJpeg(raw);
  if (!bytes) return json(req, { error: "invalid_jpeg" }, 400);
  const hash = await digest(bytes);
  const previous = await env.DB.prepare(
    'SELECT j.asset_id,j.content_hash,j.state,m.kind FROM media_upload_jobs j JOIN media_assets m ON m.id=j.asset_id WHERE j.session_id=? AND j.request_key=?'
  ).bind(sid,requestKey).first();
  if (previous) {
    if (previous.content_hash !== hash || previous.kind !== kind) return json(req, { error: 'idempotency_conflict' }, 409);
    return previous.state === 'ready' ? json(req, { id: previous.asset_id }, 201)
      : json(req, { error: previous.state === 'failed' ? 'upload_failed' : 'upload_in_progress' }, 409, { 'Retry-After': '2' });
  }
  const field = kind === 'photo' ? 'photo_count' : 'cover_count', max = kind === 'photo' ? 5 : 1;
  const id = crypto.randomUUID(), key = 'v3/' + sid + '/' + id + '.jpg';
  const reserved = await env.DB.batch([
    env.DB.prepare('INSERT INTO media_assets(id,session_id,object_key,kind,size,created_at) ' +
      'SELECT ?,?,?,?,?,? FROM media_upload_sessions WHERE id=? AND token_hash=? AND expires_at>? AND used_at IS NULL AND ' + field + ' < ?')
      .bind(id,sid,key,kind,bytes.byteLength,Date.now(),sid,await tokenHash(bearer(req)),Date.now(),max),
    env.DB.prepare('INSERT INTO media_upload_jobs(asset_id,session_id,request_key,content_hash,state) ' +
      "SELECT ?,?,?,?,'writing' WHERE EXISTS(SELECT 1 FROM media_assets WHERE id=?)")
      .bind(id,sid,requestKey,hash,id),
    env.DB.prepare('UPDATE media_upload_sessions SET ' + field + '=' + field + '+1 WHERE id=? AND EXISTS(SELECT 1 FROM media_assets WHERE id=?)').bind(sid,id),
  ]).catch(error => {
    if (String(error.message).includes('UNIQUE')) return null;
    throw error;
  });
  if (!reserved || reserved[0]?.meta?.changes !== 1) return json(req, { error: 'upload_limit_or_conflict' }, 409);
  // Intent and key are durable before R2 put. Any later failure remains discoverable by cleanup.
  try {
    await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: 'image/jpeg' } });
    const completed = await env.DB.prepare("UPDATE media_upload_jobs SET state='ready' WHERE asset_id=? AND state='writing'").bind(id).run();
    if (completed.meta?.changes !== 1) throw Error('upload_completion_lost');
  } catch (error) {
    // Retain the reservation and journal; a new session may retry, cleanup reclaims this slot/object.
    try { await env.MEDIA.delete(key); } catch { console.error('media_v3_compensation_failed'); }
    try { await env.DB.prepare("UPDATE media_upload_jobs SET state='failed' WHERE asset_id=?").bind(id).run(); } catch { /* writing intent still survives */ }
    throw error;
  }
  return json(req, { id }, 201, { 'Cache-Control': 'no-store' });
}
async function publishCard(req, env, json, cleanV2, newId) {
  const body = await readJson(req, 50000);
  const { sessionId: sid, theme } = body || {};
  if (!SID.test(sid || "") || !THEMES.has(theme))
    return json(req, { error: "bad_request" }, 400);
  if (!await sessionFor(req, env, sid, true)) return json(req, { error: "session_invalid" }, 403);
  const rawData = body.data || {};
  if (typeof rawData !== "object" || Array.isArray(rawData)) return json(req, { error: "bad_data" }, 400);
  // Do not silently accept embedded binary data in the new storage contract.
  if (Object.hasOwn(rawData, "cover") && rawData.cover != null) return json(req, { error: "embedded_media_not_allowed" }, 400);
  const photos = Array.isArray(rawData.photos) ? rawData.photos : [];
  const coverId = rawData.cover_id || null;
  if (photos.length > 5 || (coverId && !ASSET.test(coverId))) return json(req, { error: "bad_media" }, 400);
  const photoIds = [];
  const cleanPhotos = [];
  for (const p of photos) {
    if (!p || !ASSET.test(p.id || "") || Object.hasOwn(p, "src")) return json(req, { error: "bad_media" }, 400);
    photoIds.push(p.id);
    cleanPhotos.push({ id: p.id, cap: typeof p.cap === "string" ? p.cap.slice(0, 40) : "" });
  }
  const all = [...photoIds, ...(coverId ? [coverId] : [])];
  if (new Set(all).size !== all.length) return json(req, { error: "duplicate_media" }, 400);
  const safe = cleanV2({ ...rawData, photos: [], cover: null });
  if (!safe.to || !safe.from || !safe.letter) return json(req, { error: "missing" }, 400);
  const data = { ...safe, media_version: 3, photos: cleanPhotos };
  if (coverId) data.cover_id = coverId;
  const payloadHash = await digest(JSON.stringify({ theme, data }));
  const receipt = () => env.DB.prepare('SELECT card_id,payload_hash,expires_at FROM media_publications WHERE session_id=?').bind(sid).first();
  const replay = async () => {
    const previous = await receipt();
    if (!previous) return null;
    return previous.payload_hash === payloadHash
      ? json(req, { id: previous.card_id, expires: previous.expires_at }, 201)
      : json(req, { error: 'session_used' }, 409);
  };
  const previous = await replay();
  if (previous) return previous;
  for (const id of all) {
    const asset = await env.DB.prepare(
      "SELECT m.kind,m.object_key FROM media_assets m JOIN media_upload_jobs j ON j.asset_id=m.id " +
      "WHERE m.id=? AND m.session_id=? AND m.card_id IS NULL AND j.state='ready'"
    ).bind(id,sid).first();
    if (!asset || asset.kind !== (id === coverId ? 'cover' : 'photo'))
      return json(req, { error: 'invalid_media_reference' }, 400);
    if (!await env.MEDIA.head(asset.object_key)) return json(req, { error: 'media_missing' }, 409);
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const cardId = newId(), now = Date.now(), expires = now + 15 * DAY;
    const placeholders = all.length ? all.map(() => '?').join(',') : 'NULL';
    try {
      const result = await env.DB.batch([
        env.DB.prepare(
          'INSERT INTO theme_cards(id,theme,data,created_at,expires_at) SELECT ?,?,?,?,? ' +
          'WHERE EXISTS(SELECT 1 FROM media_upload_sessions WHERE id=? AND token_hash=? AND used_at IS NULL AND expires_at>?) ' +
          "AND (SELECT count(*) FROM media_assets m JOIN media_upload_jobs j ON j.asset_id=m.id WHERE m.session_id=? AND m.card_id IS NULL AND j.state='ready' AND m.id IN (" + placeholders + '))=?'
        ).bind(cardId,theme,JSON.stringify(data),now,expires,sid,await tokenHash(bearer(req)),now,sid,...all,all.length),
        ...all.map(id => env.DB.prepare('UPDATE media_assets SET card_id=?,expires_at=? WHERE id=? AND session_id=? AND card_id IS NULL AND EXISTS(SELECT 1 FROM theme_cards WHERE id=?)')
          .bind(cardId,expires,id,sid,cardId)),
        env.DB.prepare('INSERT INTO media_publications(session_id,card_id,payload_hash,expires_at) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM theme_cards WHERE id=?)')
          .bind(sid,cardId,payloadHash,expires,cardId),
        env.DB.prepare('UPDATE media_upload_sessions SET used_at=? WHERE id=? AND used_at IS NULL AND EXISTS(SELECT 1 FROM theme_cards WHERE id=?)').bind(now,sid,cardId),
      ]);
      if (result[0]?.meta?.changes !== 1) return await replay() || json(req, { error: 'session_used' }, 409);
      return json(req, { id: cardId, expires }, 201, { 'Cache-Control': 'no-store' });
    } catch (error) {
      if (!String(error?.message || error).includes('UNIQUE')) throw error;
    }
  }
  return json(req, { error: 'id_collision' }, 500);
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
  const errorHeaders = { ...cors(req), 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' };
  if (!row) return new Response("Not found", { status: 404, headers: errorHeaders });
  const object = await env.MEDIA.get(row.object_key);
  if (!object || !object.body) return new Response("Not found", { status: 404, headers: errorHeaders });
  return new Response(object.body, {
    status: 200, headers: {
      ...cors(req), "Content-Type": "image/jpeg", "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'", "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer"
    }
  });
}
export async function handleMediaV3(req, env, url, helpers) {
  if (!url.pathname.startsWith("/v3/")) return null;
  const { json, cors, cleanV2, newId } = helpers;
  if (req.method === "POST" && env.MEDIA_V3_UPLOADS_ENABLED !== "true") return json(req, { error: "uploads_disabled" }, 503);
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
  if (!env.MEDIA || !env.DB || env.MEDIA_CLEANUP_ENABLED !== 'true') return;
  const now = Date.now();
  // One hour grace for in-flight uploads; bounded batch continues past individual delete failures.
  const rows = await env.DB.prepare(
    'SELECT m.id,m.object_key FROM media_assets m LEFT JOIN media_upload_sessions s ON s.id=m.session_id ' +
    'WHERE (m.card_id IS NULL AND s.expires_at < ?) OR (m.card_id IS NOT NULL AND m.expires_at < ?) LIMIT 100'
  ).bind(now-3600000,now).all();
  let failures = 0;
  for (const row of rows.results || []) {
    try {
      await env.MEDIA.delete(row.object_key);
      await env.DB.batch([
        env.DB.prepare('DELETE FROM media_upload_jobs WHERE asset_id=?').bind(row.id),
        env.DB.prepare('DELETE FROM media_assets WHERE id=?').bind(row.id),
      ]);
    } catch { failures++; console.error('media_v3_cleanup_asset_failed'); }
  }
  await env.DB.batch([
    env.DB.prepare('DELETE FROM media_publications WHERE expires_at < ? OR card_id IN (SELECT id FROM theme_cards WHERE expires_at < ?)').bind(now,now),
    env.DB.prepare('DELETE FROM media_upload_sessions WHERE expires_at < ? AND NOT EXISTS(SELECT 1 FROM media_assets WHERE session_id=media_upload_sessions.id) AND NOT EXISTS(SELECT 1 FROM media_publications WHERE session_id=media_upload_sessions.id)').bind(now-3600000),
    env.DB.prepare("DELETE FROM theme_cards WHERE expires_at < ? AND json_extract(data,'$.media_version')=3 AND NOT EXISTS(SELECT 1 FROM media_assets WHERE card_id=theme_cards.id)").bind(now),
    env.DB.prepare('DELETE FROM media_write_budgets WHERE window_end < ?').bind(now-DAY),
  ]);
  // Reconcile the cross-service crash window: R2 put may finish after its journal was
  // reclaimed. Cursor makes this bounded scan progress through the entire v3 prefix.
  // Disable cleanup during disaster recovery until D1 and R2 have been reconciled.
  if (typeof env.MEDIA.list === 'function') {
    const state = await env.DB.prepare('SELECT cursor FROM media_cleanup_state WHERE id=?').bind('r2').first();
    const page = await env.MEDIA.list({ prefix: 'v3/', limit: 1000, ...(state?.cursor ? { cursor: state.cursor } : {}) });
    const candidates = page.objects.filter(o => o.uploaded.getTime() < now-DAY);
    const orphans = [];
    for (let offset=0;offset<candidates.length;offset+=100) {
      const objects = candidates.slice(offset,offset+100);
      const rows = await env.DB.prepare('SELECT object_key FROM media_assets WHERE object_key IN ('+objects.map(()=>'?').join(',')+')')
        .bind(...objects.map(o=>o.key)).all();
      const known = new Set(rows.results.map(r=>r.object_key));
      for (const object of objects) if (!known.has(object.key) && orphans.length<100) orphans.push(object.key);
    }
    if (orphans.length) {
      try { await env.MEDIA.delete(orphans); } catch { failures++; console.error('media_v3_orphan_cleanup_failed'); }
    }
    await env.DB.prepare('INSERT INTO media_cleanup_state(id,cursor) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET cursor=excluded.cursor')
      .bind('r2',page.truncated ? page.cursor : null).run();
  }
  console.log(JSON.stringify({ event: 'media_v3_cleanup', candidates: (rows.results || []).length, failures }));
  if (failures) throw Error('cleanup_incomplete');
}
