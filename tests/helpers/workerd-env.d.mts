import type { Miniflare } from 'miniflare';
export function workerdFixture(options?: { realTurnstile?: boolean; jpegValidator?: 'legacy' | 'images' }): Promise<{
  mf: Miniflare;
  db: Awaited<ReturnType<Miniflare['getD1Database']>>;
  bucket: { list(): Promise<{ objects: { key: string }[] }> };
  request: (path: string, init?: RequestInit) => ReturnType<Miniflare['dispatchFetch']>;
  session: () => Promise<{ sessionId: string; uploadToken: string; expires: number }>;
}>;
