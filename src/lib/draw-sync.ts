import { DRAW_COUNT, fetchPublishedSnapshot, selectSnapshot } from './draws.ts';
import type { DrawSnapshot } from './draws.ts';

const PUBLISHED_SNAPSHOT = 'https://kingking543.github.io/first/data/official-draws.json';
export function publishedSnapshotUrl(baseURI: string, version = Date.now()): string {
  const base = new URL(baseURI);
  const loopback = ['localhost', '127.0.0.1', '[::1]', '0.0.0.0'].includes(base.hostname) || base.hostname.endsWith('.localhost');
  const url = loopback ? new URL(PUBLISHED_SNAPSHOT) : new URL('data/official-draws.json', base);
  url.searchParams.set('_sync', String(version));
  return url.href;
}

export async function syncPublishedSnapshot(current: DrawSnapshot, baseURI: string, signal?: AbortSignal, fetcher: typeof fetch = fetch): Promise<DrawSnapshot> {
  signal?.throwIfAborted();
  const incoming = await fetchPublishedSnapshot(publishedSnapshotUrl(baseURI), signal, fetcher);
  signal?.throwIfAborted();
  if (incoming.draws.length !== DRAW_COUNT || Number(incoming.draws[0].period) < Number(current.draws[0].period)) throw new Error('线上响应早于已保存的开奖或期数不足');
  return selectSnapshot(current, JSON.stringify(incoming));
}
