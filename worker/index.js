// LuvNote card API — Cloudflare Worker + D1
// POST /cards            {t,to,msg,from,secret,img(base64 jpeg)} -> {id}
// GET  /cards/:id        -> {t,to,msg,from,secret,hasImg}
// GET  /cards/:id/img    -> image/jpeg
// POST /v2/cards         {theme, data}  -> {id, expires}   (theme cards, photos inline as data:image/jpeg)
// GET  /v2/cards/:id     -> {theme, data, expires}  (410 when expired)

const ORIGINS = [
  "https://luvnote.fun",
  "https://www.luvnote.fun",
  "https://cmyanything.github.io",
];
const ID_CHARS = "abcdefghijkmnpqrstuvwxyz23456789"; // 32 chars, no look-alikes
const ID_LEN = 7;
const MAX_IMG_B64 = 560000; // ~420 KB jpeg

function cors(req) {
  const o = req.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : ORIGINS[0],
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(req, obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...cors(req), ...extra },
  });
}

function newId() {
  const b = crypto.getRandomValues(new Uint8Array(ID_LEN));
  let s = "";
  for (const x of b) s += ID_CHARS[x % 32];
  return s;
}

const str = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");

async function createCard(req, env) {
  const len = Number(req.headers.get("Content-Length") || 0);
  if (len > MAX_IMG_B64 + 20000) return json(req, { error: "too_large" }, 413);

  let d;
  try {
    d = await req.json();
  } catch {
    return json(req, { error: "bad_json" }, 400);
  }

  const card = {
    t: str(d.t, 20) || "rose",
    to: str(d.to, 40).trim(),
    msg: str(d.msg, 400).trim(),
    from: str(d.from, 40).trim(),
    secret: str(d.secret, 80).trim(),
  };
  if (!card.to || !card.msg || !card.from) return json(req, { error: "missing" }, 400);

  let img = null;
  if (d.img) {
    if (typeof d.img !== "string" || d.img.length > MAX_IMG_B64) return json(req, { error: "img_too_large" }, 413);
    if (!/^\/9j\/[A-Za-z0-9+/=]+$/.test(d.img)) return json(req, { error: "img_not_jpeg" }, 400);
    img = d.img;
  }

  for (let i = 0; i < 5; i++) {
    const id = newId();
    try {
      await env.DB.prepare(
        "INSERT INTO cards (id, t, to_name, msg, from_name, secret, img, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
        .bind(id, card.t, card.to, card.msg, card.from, card.secret, img, Date.now())
        .run();
      return json(req, { id }, 201);
    } catch (e) {
      if (!String(e && e.message).includes("UNIQUE")) throw e;
    }
  }
  return json(req, { error: "id_collision" }, 500);
}

async function getCard(req, env, id) {
  const row = await env.DB.prepare(
    "SELECT t, to_name, msg, from_name, secret, img IS NOT NULL AS has_img FROM cards WHERE id = ?"
  )
    .bind(id)
    .first();
  if (!row) return json(req, { error: "not_found" }, 404);
  return json(
    req,
    { t: row.t, to: row.to_name, msg: row.msg, from: row.from_name, secret: row.secret || "", hasImg: !!row.has_img },
    200,
    { "Cache-Control": "public, max-age=300" }
  );
}

async function getImage(req, env, id) {
  const row = await env.DB.prepare("SELECT img FROM cards WHERE id = ?").bind(id).first();
  if (!row || !row.img) return new Response("not found", { status: 404, headers: cors(req) });
  const bin = atob(row.img);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Response(bytes, {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable", ...cors(req) },
  });
}

/* ---------- theme cards (v2) ---------- */
const THEMES = ["pink-coquette", "coquette-dream", "little-memories", "birthday-chat"];
const STICKERS = ["heart", "cake", "gift", "hug"];
const V2_MAX = 1900000; // bytes of JSON body
const DAY = 864e5;
const LIFE_DAYS = 15;

function cleanV2(d) {
  const s = (v, n) => (typeof v === "string" ? v.slice(0, n) : "");
  const photos = Array.isArray(d.photos) ? d.photos.slice(0, 5) : [];
  const out = {
    to: s(d.to, 40).trim(), from: s(d.from, 40).trim(),
    age: Number.isFinite(+d.age) && +d.age > 0 && +d.age < 130 ? Math.round(+d.age) : null,
    letter: s(d.letter, 700), secret: s(d.secret, 140), endMsg: s(d.endMsg, 140),
    effect: ["bows", "hearts", "pearls", "confetti", "stars"].includes(d.effect) ? d.effect : "bows",
    lock: { type: d.lock && d.lock.type === "code" ? "code" : "scratch",
            code: d.lock && /^\d{4}$/.test(d.lock.code || "") ? d.lock.code : "",
            hint: s(d.lock && d.lock.hint, 60) },
    music: d.music && d.music.type === "youtube" && /^[\w-]{11}$/.test(d.music.id || "")
      ? { type: "youtube", id: d.music.id, start: Math.max(0, Math.min(36000, Math.round(+d.music.start || 0))) }
      : { type: "demo" },
    photos: [],
  };
  if (typeof d.cover === "string" && d.cover.length < 400000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(d.cover)) out.cover = d.cover;
  if (Array.isArray(d.chat)) {
    out.chat = d.chat.slice(0, 20).map((r) => {
      if (!r || typeof r !== "object") return null;
      if (r.w === "stk") return { w: "stk", s: STICKERS.includes(r.s) ? r.s : "heart" };
      if (r.w === "pic") return { w: "pic" };
      if (r.w === "t" && Array.isArray(r.o)) { const o = r.o.slice(0, 3).map((v) => s(v, 60).trim()).filter(Boolean); return o.length ? { w: "t", o } : null; }
      if (["f", "t", "oops"].includes(r.w)) { const x = s(r.x, 120).trim(); return x ? { w: r.w, x } : null; }
      return null;
    }).filter(Boolean);
  }
  for (const p of photos) {
    if (!p || typeof p.src !== "string" || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p.src)) continue;
    out.photos.push({ src: p.src, cap: s(p.cap, 40) });
  }
  return out;
}

async function createV2(req, env) {
  const len = Number(req.headers.get("Content-Length") || 0);
  if (len > V2_MAX) return json(req, { error: "too_large" }, 413);
  let body;
  try { const txt = await req.text(); if (txt.length > V2_MAX) return json(req, { error: "too_large" }, 413); body = JSON.parse(txt); }
  catch { return json(req, { error: "bad_json" }, 400); }
  const theme = String(body.theme || "");
  if (!THEMES.includes(theme)) return json(req, { error: "bad_theme" }, 400);
  const data = cleanV2(body.data || {});
  if (!data.to || !data.from || !data.letter) return json(req, { error: "missing" }, 400);
  const now = Date.now(), exp = now + LIFE_DAYS * DAY;
  for (let i = 0; i < 5; i++) {
    const id = newId();
    try {
      await env.DB.prepare("INSERT INTO theme_cards (id, theme, data, created_at, expires_at) VALUES (?, ?, ?, ?, ?)")
        .bind(id, theme, JSON.stringify(data), now, exp).run();
      return json(req, { id, expires: exp }, 201);
    } catch (e) {
      if (!String(e && e.message).includes("UNIQUE")) throw e;
    }
  }
  return json(req, { error: "id_collision" }, 500);
}

async function getV2(req, env, id) {
  const row = await env.DB.prepare("SELECT theme, data, expires_at FROM theme_cards WHERE id = ?").bind(id).first();
  if (!row) return json(req, { error: "not_found" }, 404);
  if (row.expires_at < Date.now()) return json(req, { error: "expired", expires: row.expires_at }, 410);
  return json(req, { theme: row.theme, data: JSON.parse(row.data), expires: row.expires_at }, 200, { "Cache-Control": "public, max-age=120" });
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });

    const url = new URL(req.url);
    if (url.pathname === "/" || url.pathname === "/health") return json(req, { ok: true, service: "luvnote-api" });

    const v2 = url.pathname.match(/^\/v2\/cards(?:\/([a-z0-9]{7}))?\/?$/);
    if (v2) {
      try {
        if (req.method === "POST" && !v2[1]) return await createV2(req, env);
        if (req.method === "GET" && v2[1]) return await getV2(req, env, v2[1]);
        return json(req, { error: "method_not_allowed" }, 405);
      } catch (e) {
        return json(req, { error: "server_error" }, 500);
      }
    }

    const m = url.pathname.match(/^\/cards(?:\/([a-z0-9]{7})(\/img)?)?\/?$/);
    if (!m) return json(req, { error: "not_found" }, 404);

    try {
      if (req.method === "POST" && !m[1]) return await createCard(req, env);
      if (req.method === "GET" && m[1] && m[2]) return await getImage(req, env, m[1]);
      if (req.method === "GET" && m[1]) return await getCard(req, env, m[1]);
      return json(req, { error: "method_not_allowed" }, 405);
    } catch (e) {
      return json(req, { error: "server_error" }, 500);
    }
  },
};
