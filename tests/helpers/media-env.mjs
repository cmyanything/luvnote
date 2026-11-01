import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import jpeg from 'jpeg-js';
import worker from '../../worker/index.js';

export const sid = '11111111-1111-4111-8111-111111111111';
export const token = 'a'.repeat(64);
export const origin = 'https://api.example.test';
export const image = jpeg.encode({ width: 8, height: 8, data: new Uint8Array(8 * 8 * 4).fill(180) }, 80).data;
export async function fixture() {
  const sql = new DatabaseSync(':memory:');
  sql.exec('PRAGMA foreign_keys=ON');
  sql.exec(readFileSync(new URL('../../worker/schema.sql', import.meta.url), 'utf8'));
  const objects = new Map();
  const env = {
    MEDIA_V3_UPLOADS_ENABLED: 'true',
    MEDIA_CLEANUP_ENABLED: 'true',
    TURNSTILE_SECRET_KEY: 'unit-test-secret',
    WRITE_LIMITER: { limit: async () => ({ success: true }) },
    MEDIA: {
      async put(key, bytes) { objects.set(key, new Uint8Array(bytes)); return { key }; },
      async get(key) { return objects.has(key) ? { body: new Response(objects.get(key)).body } : null; },
      async head(key) { return objects.has(key) ? { key, size: objects.get(key).byteLength } : null; },
      async delete(key) { objects.delete(key); },
    },
    DB: {
      prepare(query) {
        return { bind(...values) {
          const execute = () => {
            if (env.failSQL?.(query)) throw Error('injected D1 failure');
            const statement = sql.prepare(query);
            if (/^\s*(SELECT|PRAGMA)/i.test(query) || /RETURNING/i.test(query)) {
              const results = statement.all(...values);
              return { results, meta: { changes: Number(sql.prepare('SELECT changes() n').get().n) } };
            }
            const result = statement.run(...values);
            return { results: [], meta: { changes: Number(result.changes) } };
          };
          return { execute, first: async () => execute().results[0] || null, all: async () => execute(), run: async () => execute() };
        } };
      },
      async batch(statements) {
        env.beforeBatch?.();
        sql.exec('BEGIN');
        try { const result = statements.map(s => s.execute()); sql.exec('COMMIT'); return result; }
        catch (error) { sql.exec('ROLLBACK'); throw error; }
      },
    },
  };
  const digest = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))).toString('hex');
  sql.prepare('INSERT INTO media_upload_sessions(id,token_hash,created_at,expires_at) VALUES(?,?,?,?)').run(sid,digest,Date.now(),Date.now()+1800000);
  const request = (path, { body, headers, ...options } = {}) => worker.fetch(new Request(origin + path, {
    ...options, headers: { Authorization: 'Bearer ' + token, 'CF-Connecting-IP': '192.0.2.1', ...headers },
    ...(body === undefined ? {} : { body }),
  }), env);
  const upload = (bytes = image, key = crypto.randomUUID(), kind = 'photo') => request(`/v3/upload-sessions/${sid}/media?kind=${kind}`, {
    method: 'POST', headers: { 'Content-Type': 'image/jpeg', 'Idempotency-Key': key }, body: bytes,
  });
  const publish = (photos = [], extras = {}) => request('/v3/cards', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      theme: 'pink-coquette', sessionId: sid, data: { to: 'Synthetic', from: 'Test', letter: 'Fixture', photos, ...extras },
    }),
  });
  return { env, sql, objects, request, upload, publish };
}
