import { test, expect } from '@playwright/test';
// Real Worker + in-memory SQLite D1 with the production schema, rate limiter and quotas.
import { fixture } from './helpers/media-env.mjs';

test('Worker round-trips anniversary dates, captions and photo order through D1', async () => {
  const f = await fixture();
  const create = (body: object) =>
    f.request('/v2/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://luvnote.fun' },
      body: JSON.stringify(body),
    });
  const health = await f.request('/health');
  expect((await health.json()).ok).toBe(true);
  const data = {
    to: 'เธอ',
    from: 'เรา',
    letter: 'รักเสมอ',
    startDate: '2024-02-29',
    photos: [
      { src: 'data:image/jpeg;base64,/9j/2Q==', cap: 'วันสำคัญ', date: '2024-03-01' },
      { src: 'data:image/jpeg;base64,/9j/2Q==', cap: 'วันที่ไม่ถูกต้องจะถูกตัดออก', date: '2025-02-29' },
    ],
  };
  const response = await create({ theme: 'anniversary-journey', data });
  expect(response.status).toBe(201);
  const created = await response.json();
  const result = await (await f.request(`/v2/cards/${created.id}`)).json();
  expect(result.theme).toBe('anniversary-journey');
  expect(result.data.startDate).toBe('2024-02-29');
  expect(result.data.photos[0]).toMatchObject({ cap: 'วันสำคัญ', date: '2024-03-01' });
  expect(result.data.photos[1]).not.toHaveProperty('date');
  const invalid = await create({ theme: 'anniversary-journey', data: { ...data, startDate: '2025-02-29' } });
  expect(invalid.status).toBe(400);
  expect(await invalid.json()).toEqual({ error: 'missing_start_date' });

});

test('Worker accepts a brand-new template id without an API change', async () => {
  const f = await fixture();
  const create = (body: object) =>
    f.request('/v2/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://luvnote.fun' },
      body: JSON.stringify(body),
    });
  const data = { to: 'เธอ', from: 'เรา', letter: 'รักเสมอ' };
  expect((await create({ theme: 'future-template', occasion: 'birthday', data })).status).toBe(201);
  const noDate = await create({ theme: 'future-anniversary', occasion: 'anniversary', data });
  expect(await noDate.json()).toEqual({ error: 'missing_start_date' });
  expect((await create({ theme: 'future-anniversary', occasion: 'anniversary', data: { ...data, startDate: '2024-02-29' } })).status).toBe(201);
  expect((await create({ theme: '../bad', data })).status).toBe(400);
});
