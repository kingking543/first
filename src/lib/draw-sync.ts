import { DRAW_COUNT, assertCompatibleDraws, fetchPublishedSnapshot, parseSnapshot, selectSnapshot } from './draws.ts';
import type { DrawSnapshot } from './draws.ts';

const LIVE_SNAPSHOT = 'https://first-wine-iota.vercel.app/data/official-draws.json';
const BACKUP_SNAPSHOT = 'https://kingking543.github.io/first/data/official-draws.json';
export function publishedSnapshotUrl(baseURI: string, version = Date.now()): string {
  const base = new URL(baseURI);
  const loopback = ['localhost', '127.0.0.1', '[::1]', '0.0.0.0'].includes(base.hostname) || base.hostname.endsWith('.localhost');
  const pages = base.hostname === 'kingking543.github.io' && (base.pathname === '/first' || base.pathname.startsWith('/first/'));
  const url = loopback || pages ? new URL(LIVE_SNAPSHOT) : new URL('data/official-draws.json', base);
  url.searchParams.set('_sync', String(version));
  return url.href;
}
function accept(current: DrawSnapshot, incoming: DrawSnapshot): DrawSnapshot {
  if (incoming.draws.length !== DRAW_COUNT) throw new Error('线上期数不足');
  assertCompatibleDraws(incoming.draws, current.draws);
  return selectSnapshot(current, JSON.stringify(incoming));
}
export async function syncPublishedSnapshot(current: DrawSnapshot, baseURI: string, signal?: AbortSignal, fetcher: typeof fetch = fetch): Promise<{ snapshot: DrawSnapshot; verification: 'official' | 'snapshot' }> {
  signal?.throwIfAborted();
  try {
    const response = await fetcher(publishedSnapshotUrl(baseURI), { signal, credentials: 'omit', cache: 'no-store' });
    if (!response.ok) throw new Error('实时开奖接口暂不可用');
    const payload: unknown = await response.json();
    signal?.throwIfAborted();
    const snapshot = accept(current, parseSnapshot(payload));
    const verified = payload && typeof payload === 'object' && 'verification' in payload && payload.verification === 'official';
    return { snapshot, verification: verified ? 'official' : 'snapshot' };
  } catch {
    signal?.throwIfAborted();
    const backup = new URL(BACKUP_SNAPSHOT);
    backup.searchParams.set('_sync', String(Date.now()));
    const incoming = await fetchPublishedSnapshot(backup.href, signal, fetcher);
    signal?.throwIfAborted();
    return { snapshot: accept(current, incoming), verification: 'snapshot' };
  }
}
