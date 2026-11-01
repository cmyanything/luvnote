// Small bounded readers and fail-closed write controls shared by V1/V2/V3.
export async function readLimitedBody(request, limit) {
  if (Number(request.headers.get('Content-Length') || 0) > limit) return null;
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const parts = [];
  let total = 0, timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(Object.assign(new Error('body_timeout'), { status: 408 }));
      void reader.cancel().catch(() => {});
    }, 20000);
  });
  try {
    while (true) {
      const { value, done } = await Promise.race([reader.read(), timeout]);
      if (done) break;
      total += value.byteLength;
      if (total > limit) { await reader.cancel().catch(() => {}); return null; }
      parts.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
    return bytes;
  } finally { clearTimeout(timer); reader.releaseLock(); }
}

export async function readJson(req, limit) {
  const bytes = await readLimitedBody(req, limit);
  if (bytes === null) throw Object.assign(new Error('too_large'), { status: 413 });
  let value;
  try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw Object.assign(new Error('bad_json'), { status: 400 }); }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Object.assign(new Error('bad_json'), { status: 400 });
  return value;
}

export async function digest(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', typeof value === 'string'
    ? new TextEncoder().encode(value) : value)), b => b.toString(16).padStart(2, '0')).join('');
}

export async function reserveBudget(env, key, limit, windowMs) {
  const end = Math.floor(Date.now() / windowMs) * windowMs + windowMs;
  const row = await env.DB.prepare(
    'INSERT INTO media_write_budgets (budget_key,window_end,count) VALUES (?,?,1) ' +
    'ON CONFLICT(budget_key,window_end) DO UPDATE SET count=count+1 WHERE count < ? RETURNING budget_key'
  ).bind(key, end, limit).first();
  return !!row;
}

export async function guardWrite(req, env) {
  // Binding is deliberately mandatory: a broken deployment cannot silently remove protection.
  if (!env.WRITE_LIMITER) return 'abuse_protection_unavailable';
  const ip = req.headers.get('CF-Connecting-IP');
  if (!ip) return 'abuse_protection_unavailable';
  const key = await digest(ip);
  const local = await env.WRITE_LIMITER.limit({ key });
  const aggregate = await env.WRITE_LIMITER.limit({ key: 'aggregate' });
  return local.success && aggregate.success ? null : 'rate_limited';
}

// Calendar date "YYYY-MM-DD" (anniversary start / photo dates); "" when invalid.
export function civilDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "1900-01-01") return "";
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : "";
}
