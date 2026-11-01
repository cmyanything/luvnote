import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

test('Worker round-trips anniversary dates, captions and photo order through D1', async () => {
  const { default: worker } = await import(
    pathToFileURL(resolve('worker/index.js')).href
  );
  const records = new Map<string, any>();
  const env = {
    DB: {
      prepare(sql: string) {
        return {
          bind(...values: any[]) {
            return {
              async run() {
                if (sql.startsWith('INSERT INTO theme_cards')) {
                  const [id, theme, data, created_at, expires_at] = values;
                  records.set(id, { id, theme, data, created_at, expires_at });
                }
              },
              async first() {
                return records.get(values[0]) || null;
              },
            };
          },
        };
      },
    },
  };
  const request = (body: object) =>
    new Request('https://api.luvnote.fun/v2/cards', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://luvnote.fun',
      },
      body: JSON.stringify(body),
    });
  const health = await worker.fetch(
    new Request('https://api.luvnote.fun/health'),
    env,
  );
  expect((await health.json()).themes).toContain('anniversary-journey');
  const data = {
    to: 'เธอ',
    from: 'เรา',
    letter: 'รักเสมอ',
    startDate: '2024-02-29',
    photos: [
      {
        src: 'data:image/jpeg;base64,/9j/2Q==',
        cap: 'วันสำคัญ',
        date: '2024-03-01',
      },
      {
        src: 'data:image/jpeg;base64,/9j/2Q==',
        cap: 'วันที่ไม่ถูกต้องจะถูกตัดออก',
        date: '2025-02-29',
      },
    ],
  };
  const response = await worker.fetch(
    request({ theme: 'anniversary-journey', data }),
    env,
  );
  expect(response.status).toBe(201);
  const created = await response.json();
  const saved = await worker.fetch(
    new Request(`https://api.luvnote.fun/v2/cards/${created.id}`),
    env,
  );
  const result = await saved.json();
  expect(result.theme).toBe('anniversary-journey');
  expect(result.data.startDate).toBe('2024-02-29');
  expect(result.data.photos[0]).toMatchObject({
    cap: 'วันสำคัญ',
    date: '2024-03-01',
  });
  expect(result.data.photos[1]).not.toHaveProperty('date');
  const invalid = await worker.fetch(
    request({
      theme: 'anniversary-journey',
      data: { ...data, startDate: '2025-02-29' },
    }),
    env,
  );
  expect(invalid.status).toBe(400);
  expect(await invalid.json()).toEqual({ error: 'missing_start_date' });
});
