#!/usr/bin/env node
// Staging-only baseline: CPU of today's production card path (V2, Base64 photos in JSON)
// so V3 upload CPU can be compared with what production already serves. Synthetic data only.
import jpeg from 'jpeg-js';
import { stagingTarget } from './staging-safety.mjs';

if (process.env.ALLOW_STAGING_WRITE !== '1') throw Error('ALLOW_STAGING_WRITE=1 required');
const endpoint = stagingTarget(process.env.STAGING_API_URL || '');
// Realistic editor output: 900x675 photo-like noise at quality 78, five photos per card.
let seed = 42;
const photo = () => {
  const w = 900, h = 675, px = new Uint8Array(w * h * 4);
  for (let i = 0; i < px.length; i += 4) for (let c = 0; c < 3; c++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    px[i + c] = Math.round(120 + 60 * Math.sin((i / 4 % w) / 30 + c) + (seed >>> 27));
  }
  return 'data:image/jpeg;base64,' + Buffer.from(jpeg.encode({ width: w, height: h, data: px }, 78).data).toString('base64');
};
const photos = Array.from({ length: 5 }, () => ({ src: photo(), cap: 'test' }));
const body = JSON.stringify({ theme: 'pink-coquette', data: { to: 'Staging', from: 'CPU baseline', letter: 'synthetic', photos } });
console.log(JSON.stringify({ v2BodyBytes: body.length }));
for (let i = 0; i < 3; i++) {
  const r = await fetch(endpoint + '/v2/cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(30000) });
  console.log(JSON.stringify({ name: 'v2-baseline', status: r.status, body: (await r.text()).slice(0, 80) }));
}
