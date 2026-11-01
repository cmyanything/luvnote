// Types for the in-memory Worker + SQLite D1 fixture used by API tests.
export const sid: string;
export const token: string;
export const origin: string;
export const image: Uint8Array;
export function fixture(): Promise<{
  env: Record<string, unknown>;
  sql: { prepare(query: string): { get(...values: unknown[]): any; all(...values: unknown[]): any[]; run(...values: unknown[]): unknown } };
  objects: Map<string, Uint8Array>;
  request(path: string, init?: RequestInit & { headers?: Record<string, string> }): Promise<Response>;
  upload(bytes?: Uint8Array, key?: string, kind?: string): Promise<Response>;
  publish(photos?: unknown[], extras?: Record<string, unknown>): Promise<Response>;
}>;
