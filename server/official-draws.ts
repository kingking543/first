import { DRAW_COUNT, OFFICIAL_HISTORY_URL, assertCompatibleDraws, parseOfficialHistory, parseSnapshot, selectSnapshot } from '../src/lib/draws.ts';
import type { DrawSnapshot } from '../src/lib/draws.ts';
import { FUJIAN_HISTORY_URL, parseFujianHistory, requestJson } from '../scripts/fetch-draws.ts';

const BACKUP_URL = 'https://kingking543.github.io/first/data/official-draws.json';
interface Options { fetcher?: typeof fetch; signal?: AbortSignal; budgetMs?: number; }
export interface VerifiedResult { snapshot: DrawSnapshot; verification: 'official' | 'snapshot'; }
const message = (error: unknown) => error instanceof Error ? error.message : String(error);

export async function refreshOfficialSnapshot(bundled: DrawSnapshot, options: Options = {}): Promise<VerifiedResult> {
  options.signal?.throwIfAborted();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('官方核验超时', 'TimeoutError')), options.budgetMs ?? 8000);
  const signal = options.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal;
  const sources = [
    { id: 'china-sporttery', url: OFFICIAL_HISTORY_URL, parse: parseOfficialHistory },
    { id: 'fujian-sporttery', url: FUJIAN_HISTORY_URL, parse: parseFujianHistory },
  ] as const;
  try {
    const publishedSignal = AbortSignal.any([signal, AbortSignal.timeout(3000)]);
    const settled = await Promise.allSettled([
      requestJson(BACKUP_URL, { signal: publishedSignal, fetcher: options.fetcher, timeoutMs: 2500 }),
      ...sources.map(source => requestJson(source.url, { signal, fetcher: options.fetcher, timeoutMs: 2500 })),
    ]);
    options.signal?.throwIfAborted();
    let fallback = bundled;
    const published = settled[0];
    if (published.status === 'fulfilled') {
      try {
        const candidate = parseSnapshot(published.value);
        const [newer, older] = Number(candidate.draws[0].period) >= Number(fallback.draws[0].period) ? [candidate, fallback] : [fallback, candidate];
        assertCompatibleDraws(newer.draws, older.draws);
        fallback = selectSnapshot(fallback, JSON.stringify(candidate));
      } catch (error) { console.warn('已发布开奖备份未通过核验：', message(error)); }
    } else { console.warn('已发布开奖备份暂不可用：', message(published.reason)); }
    const candidates: DrawSnapshot[] = [];
    sources.forEach((source, i) => {
      const response = settled[i + 1];
      try {
        if (response.status === 'rejected') throw response.reason;
        const draws = source.parse(response.value);
        if (draws.length !== DRAW_COUNT) throw new Error('官方期数不足');
        assertCompatibleDraws(draws, fallback.draws);
        candidates.push({ source: source.id, draws, fetchedAt: new Date().toISOString() });
      } catch (error) { console.warn(`实时官方源未通过核验：${source.id}：${message(error)}`); }
    });
    candidates.sort((a, b) => Number(b.draws[0].period) - Number(a.draws[0].period));
    if (candidates.length > 1) {
      try { assertCompatibleDraws(candidates[0].draws, candidates[1].draws); }
      catch (error) {
        console.warn('实时官方源存在冲突，保留已核验快照：', message(error));
        return { snapshot: fallback, verification: 'snapshot' };
      }
    }
    return candidates.length ? { snapshot: candidates[0], verification: 'official' } : { snapshot: fallback, verification: 'snapshot' };
  } finally { clearTimeout(timer); }
}

const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store', 'CDN-Cache-Control': 'no-store', 'Vercel-CDN-Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Cache-Control, Pragma',
};
export async function officialDrawResponse(request: Request, bundled: DrawSnapshot, options: Options = {}): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: HEADERS });
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405, headers: { ...HEADERS, Allow: 'GET, HEAD, OPTIONS' } });
  try {
    const result = await refreshOfficialSnapshot(bundled, { ...options, signal: request.signal });
    console.info('开奖查询完成', { verification: result.verification, period: result.snapshot.draws[0].period, source: result.snapshot.source, fetchedAt: result.snapshot.fetchedAt });
    return new Response(request.method === 'HEAD' ? null : JSON.stringify({ ...result.snapshot, verification: result.verification }), { headers: HEADERS });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499, headers: HEADERS });
    console.error('实时开奖接口失败：', message(error));
    return new Response(JSON.stringify({ error: '官方核验暂不可用' }), { status: 503, headers: HEADERS });
  }
}
