import { resolve } from 'node:path';

export function validateEnvironment(env: Record<string, unknown>): Record<string, unknown> {
  const portText = String(env.PORT ?? '3000');
  if (!/^\d+$/.test(portText) || Number(portText) < 1 || Number(portText) > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  const origins = String(env.CORS_ORIGINS ?? 'http://localhost:5173').split(',').map(value => value.trim()).filter(Boolean);
  for (const origin of origins) {
    const parsed = new URL(origin);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) {
      throw new Error('CORS_ORIGINS must contain comma-separated HTTP(S) origins without paths');
    }
  }
  const sqlite = String(env.SQLITE_PATH ?? './var/catalog.sqlite').trim();
  if (!sqlite) throw new Error('SQLITE_PATH must not be empty');
  return { ...env, PORT: Number(portText), HOST: String(env.HOST ?? '127.0.0.1'), CORS_ORIGINS: origins, SQLITE_PATH: sqlite === ':memory:' ? sqlite : resolve(sqlite) };
}
