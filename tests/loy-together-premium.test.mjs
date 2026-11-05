import assert from 'node:assert/strict';
import test from 'node:test';
import { fixture, token } from './helpers/media-env.mjs';

// Loy Together: faces travel with the card, customers may only *ask* for premium,
// and only the owner's admin unlock turns it on (and keeps it on through owner edits).
const ADMIN = 'owner-admin-key-'.padEnd(40, 'x');
const sid2 = '33333333-3333-4333-8333-333333333333';
const token2 = 'c'.repeat(64);

async function loyCard(extras = {}) {
  const f = await fixture();
  f.env.ADMIN_KEY = ADMIN;
  const face = await (await f.upload()).json();
  const res = await f.request('/v3/cards', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      theme: 'loy-together', occasion: 'festival', sessionId: '11111111-1111-4111-8111-111111111111',
      data: { to: 'Mind', from: 'Poom', letter: 'Loy together', photos: [{ id: face.id, cap: '' }], ...extras },
    }),
  });
  assert.equal(res.status, 201);
  const card = await res.json();
  const read = async () => (await (await f.request(`/v2/cards/${card.id}`)).json()).data;
  const premium = (on, key = ADMIN) => f.request('/v3/admin/premium', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Key': key },
    body: JSON.stringify({ cardId: card.id, premium: on }),
  });
  return { f, card, read, premium };
}

test('faces and a premium request are stored, but a client cannot grant itself premium', async () => {
  const { read } = await loyCard({ faces: ['to', 'to', 'x', 'from'], wantPremium: true, premium: true });
  const data = await read();
  assert.deepEqual(data.faces, ['to', 'from']);
  assert.equal(data.wantPremium, true);
  assert.equal(data.premium, undefined);
});

test('admin premium unlock needs the admin key, then turns premium on and off', async () => {
  const { f, card, read, premium } = await loyCard({ faces: ['from'], wantPremium: true });
  assert.equal((await premium(true, 'wrong-key')).status, 403);
  delete f.env.ADMIN_KEY;
  assert.equal((await premium(true)).status, 503);
  f.env.ADMIN_KEY = ADMIN;
  const res = await premium(true);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { cardId: card.id, theme: 'loy-together', premium: true, requested: true, expires: card.expires });
  assert.equal((await read()).premium, true);
  assert.equal((await premium(false)).status, 200);
  assert.equal((await read()).premium, undefined);
  const missing = await f.request('/v3/admin/premium', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN }, body: JSON.stringify({ cardId: 'zzzzzzz' }),
  });
  assert.equal(missing.status, 404);
});

test('an unlocked card stays premium when its owner edits it', async () => {
  const { f, card, read, premium } = await loyCard({ faces: ['from'], wantPremium: true });
  assert.equal((await premium(true)).status, 200);
  const hash = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token2))).toString('hex');
  f.sql.prepare('INSERT INTO media_upload_sessions(id,token_hash,created_at,expires_at) VALUES(?,?,?,?)').run(sid2, hash, Date.now(), Date.now() + 1800000);
  const res = await f.request(`/v3/cards/${card.id}/edit`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + token2, 'Content-Type': 'application/json' }, body: JSON.stringify({
      theme: 'loy-together', occasion: 'festival', sessionId: sid2, editKey: token,
      data: { to: 'Mind', from: 'Poom', letter: 'Edited sky letter', photos: [], premium: false },
    }),
  });
  assert.equal(res.status, 200);
  const data = await read();
  assert.equal(data.letter, 'Edited sky letter');
  assert.equal(data.premium, true);
});
