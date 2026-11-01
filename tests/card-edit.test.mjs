import assert from 'node:assert/strict';
import test from 'node:test';
import jpeg from 'jpeg-js';
import { fixture, image, sid, token } from './helpers/media-env.mjs';
import { cleanupMediaV3, CARD_LIFE_MS } from '../worker/media-v3.js';

const sid2 = '22222222-2222-4222-8222-222222222222';
const token2 = 'b'.repeat(64);
const other = jpeg.encode({ width: 8, height: 8, data: new Uint8Array(8 * 8 * 4).fill(60) }, 80).data;

async function created() {
  const f = await fixture();
  const asset = await (await f.upload()).json();
  const res = await f.publish([{ id: asset.id, cap: 'old' }]);
  assert.equal(res.status, 201);
  const card = await res.json();
  const hash = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token2))).toString('hex');
  f.sql.prepare('INSERT INTO media_upload_sessions(id,token_hash,created_at,expires_at) VALUES(?,?,?,?)').run(sid2, hash, Date.now(), Date.now() + 1800000);
  const auth = { Authorization: 'Bearer ' + token2 };
  const upload2 = (bytes = other, kind = 'photo') => f.request(`/v3/upload-sessions/${sid2}/media?kind=${kind}`, {
    method: 'POST', headers: { ...auth, 'Content-Type': 'image/jpeg', 'Idempotency-Key': crypto.randomUUID() }, body: bytes,
  });
  const edit = (photos, { editKey = token, theme = 'pink-coquette', extras = {}, cardId = card.id } = {}) => f.request(`/v3/cards/${cardId}/edit`, {
    method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({
      theme, sessionId: sid2, editKey, data: { to: 'Edited', from: 'Owner', letter: 'New letter', photos, ...extras },
    }),
  });
  return { f, card, oldAsset: asset, upload2, edit };
}

test('new cards live for 90 days and store only a hash of the edit key', async () => {
  const { f, card } = await created();
  const expected = Date.now() + CARD_LIFE_MS;
  assert.ok(Math.abs(card.expires - expected) < 5000);
  const row = f.sql.prepare('SELECT key_hash FROM card_edit_keys WHERE card_id=?').get(card.id);
  assert.match(row.key_hash, /^[0-9a-f]{64}$/);
  assert.notEqual(row.key_hash, token);
});

test('the owner replaces content and photos while the link and expiry stay the same', async () => {
  const { f, card, oldAsset, upload2, edit } = await created();
  const fresh = await (await upload2()).json();
  const res = await edit([{ id: fresh.id, cap: 'new' }]);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { id: card.id, expires: card.expires });
  const read = await (await f.request('/v2/cards/' + card.id)).json();
  assert.equal(read.data.to, 'Edited');
  assert.equal(read.data.photos.length, 1);
  assert.equal(read.data.photos[0].cap, 'new');
  const photo = await f.request(new URL(read.data.photos[0].src).pathname);
  assert.equal(photo.status, 200);
  assert.deepEqual(jpeg.decode(new Uint8Array(await photo.arrayBuffer())).data, jpeg.decode(other).data);
  // The replaced photo is no longer served and is reclaimed by cleanup.
  assert.equal((await f.request(`/v3/cards/${card.id}/media/${oldAsset.id}`)).status, 404);
  const before = f.objects.size;
  await cleanupMediaV3(f.env);
  assert.equal(f.objects.size, before - 1);
  assert.equal(f.sql.prepare('SELECT count(*) n FROM media_assets WHERE card_id=?').get(card.id).n, 1);
});

test('edits are idempotent per session and can repeat with a new session', async () => {
  const { card, upload2, edit } = await created();
  const fresh = await (await upload2()).json();
  assert.equal((await edit([{ id: fresh.id }])).status, 200);
  const again = await edit([{ id: fresh.id }]);
  assert.equal(again.status, 200);
  assert.equal((await again.json()).id, card.id);
  assert.equal((await edit([{ id: fresh.id }], { extras: { letter: 'different' } })).status, 409);
});

test('wrong edit key, other card, other theme and expired cards are rejected without changes', async () => {
  const { f, card, upload2, edit } = await created();
  const fresh = await (await upload2()).json();
  assert.equal((await edit([{ id: fresh.id }], { editKey: 'c'.repeat(64) })).status, 403);
  assert.equal((await edit([{ id: fresh.id }], { cardId: 'zzzzzzz' })).status, 403);
  assert.equal((await edit([{ id: fresh.id }], { theme: 'velvet-gift' })).status, 400);
  f.sql.prepare('UPDATE theme_cards SET expires_at=? WHERE id=?').run(Date.now() - 1000, card.id);
  assert.equal((await edit([{ id: fresh.id }])).status, 410);
  assert.equal(JSON.parse(f.sql.prepare('SELECT data FROM theme_cards WHERE id=?').get(card.id).data).to, 'Synthetic');
  assert.equal(f.sql.prepare('SELECT card_id FROM media_assets WHERE id=?').get(fresh.id).card_id, null);
});

test('edits cannot reference photos from another session or embed images', async () => {
  const { oldAsset, edit } = await created();
  assert.equal((await edit([{ id: oldAsset.id }])).status, 400);
  assert.equal((await edit([], { extras: { cover: 'data:image/jpeg;base64,AAAA' } })).status, 400);
});

test('cleanup removes edit keys and receipts with expired cards', async () => {
  const { f, card, upload2, edit } = await created();
  const fresh = await (await upload2()).json();
  assert.equal((await edit([{ id: fresh.id }])).status, 200);
  f.sql.prepare('UPDATE theme_cards SET expires_at=? WHERE id=?').run(Date.now() - 1000, card.id);
  f.sql.prepare('UPDATE media_assets SET expires_at=? WHERE card_id=?').run(Date.now() - 1000, card.id);
  await cleanupMediaV3(f.env);
  assert.equal(f.sql.prepare('SELECT count(*) n FROM card_edit_keys').get().n, 0);
  assert.equal(f.sql.prepare('SELECT count(*) n FROM card_edits').get().n, 0);
});

test('a session cannot both publish a card and edit another', async () => {
  const { f, edit } = await created();
  // sid was consumed by publication; reusing its token as the session bearer fails.
  const res = await f.request('/v3/cards/aaaaaaa/edit', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme: 'pink-coquette', sessionId: sid, editKey: token, data: { to: 'x', from: 'y', letter: 'z', photos: [] } }),
  });
  assert.ok([403, 409].includes(res.status));
  void edit; void image;
});

test('Our Story R2 cards require a start date and keep photo dates', async () => {
  const f = await fixture();
  const asset = await (await f.upload()).json();
  const publish = (data) => f.request('/v3/cards', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme: 'anniversary-journey', sessionId: sid, data: { to: 'A', from: 'B', letter: 'L', ...data } }),
  });
  assert.equal((await publish({ photos: [{ id: asset.id }] })).status, 400);
  assert.equal((await publish({ startDate: '2023-02-30', photos: [{ id: asset.id }] })).status, 400);
  const res = await publish({ startDate: '2024-02-29', photos: [{ id: asset.id, cap: 'first trip', date: '2024-03-15' }] });
  assert.equal(res.status, 201);
  const card = await res.json();
  const read = await (await f.request('/v2/cards/' + card.id)).json();
  assert.equal(read.theme, 'anniversary-journey');
  assert.equal(read.data.startDate, '2024-02-29');
  assert.equal(read.data.photos[0].date, '2024-03-15');
  assert.equal(read.data.photos[0].cap, 'first trip');
  assert.match(read.data.photos[0].src, /\/v3\/cards\/[a-z0-9]{7}\/media\//);
});
