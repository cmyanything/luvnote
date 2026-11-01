import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../worker/index.js';
import { materializeV3Card, cleanupMediaV3 } from '../worker/media-v3.js';

const uuid = '11111111-1111-4111-8111-111111111111';
const second = '22222222-2222-4222-8222-222222222222';
const origin = 'https://api.luvnote.fun';

test('legacy V2 data is preserved byte-for-byte by the materializer', () => {
  const old = { to: 'Recipient', photos: [{ src: 'data:image/jpeg;base64,/9j/', cap: 'A' }] };
  assert.equal(materializeV3Card(old, 'abc2345', origin), old);
});

test('V3 photos and cover become card-scoped URLs without leaking object paths', () => {
  const data = { media_version: 3, to: 'Recipient', photos: [{ id: uuid, cap: 'memory' }], cover_id: second };
  const result = materializeV3Card(data, 'abc2345', origin);
  assert.deepEqual(result.photos, [{ src: origin + '/v3/cards/abc2345/media/' + uuid, cap: 'memory' }]);
  assert.equal(result.cover, origin + '/v3/cards/abc2345/media/' + second);
  assert.equal('media_version' in result, false);
  assert.equal('cover_id' in result, false);
});

test('V3 endpoints fail closed without configured MEDIA binding', async () => {
  const response = await worker.fetch(new Request(origin + '/v3/upload-sessions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  }), { DB: {} });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'media_storage_unavailable' });
});

test('upload sessions require server-side Turnstile secret', async () => {
  const response = await worker.fetch(new Request(origin + '/v3/upload-sessions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  }), { MEDIA: {}, DB: {} });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'turnstile_not_configured' });
});

test('unrelated card media is not retrievable', async () => {
  const env = {
    DB: {
      prepare() {
        return { bind() { return { first: async () => null }; } };
      },
    },
    MEDIA: { get: async () => { throw Error('R2 must not be reached for invalid media'); } },
  };
  const result = await worker.fetch(new Request(origin + '/v3/cards/abc2345/media/' + uuid), env);
  assert.equal(result.status, 404);
});

test('a bound live card image can be read as JPEG', async () => {
  const jpeg = new Uint8Array([255, 216, 255, 224, 0, 16, 255, 217]);
  const env = {
    DB: {
      prepare() {
        return { bind() { return { first: async () => ({ object_key: 'v3/session/image.jpg' }) }; } };
      },
    },
    MEDIA: { get: async () => ({ body: new Response(jpeg).body }) },
  };
  const result = await worker.fetch(new Request(origin + '/v3/cards/abc2345/media/' + uuid), env);
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('content-type'), 'image/jpeg');
  assert.equal(result.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual(new Uint8Array(await result.arrayBuffer()), jpeg);
});

test('scheduled cleanup executes with no candidates', async () => {
  const sql = [];
  const env = {
    MEDIA: {},
    DB: {
      prepare(query) {
        sql.push(query);
        return { bind() { return { all: async () => ({ results: [] }), run: async () => ({ success: true }) }; } };
      },
    },
  };
  await cleanupMediaV3(env);
  assert.ok(sql.some(s => s.includes('media_assets')));
});
