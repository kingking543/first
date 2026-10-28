import { setTimeout as delay } from 'node:timers/promises';
import { DRAW_COUNT, OFFICIAL_HISTORY_URL, parseOfficialHistory } from '../src/lib/draws.ts';
import type { DrawSnapshot, WinningDraw } from '../src/lib/draws.ts';

export const FUJIAN_HISTORY_URL = 'https://www.fjtc.com.cn/data_api/lottery?type=dlt&page=1&limit=50&so_start=&so_end=';
interface RequestOptions {
  signal?: AbortSignal;
  fetcher?: typeof fetch;
  timeoutMs?: number;
  wait?: (ms: number, signal?: AbortSignal) => Promise<void>;
}
export class HttpFailure extends Error {
  constructor(public status: number) { super(`HTTP ${status}`); }
}
function transient(error: unknown) {
  if (error instanceof HttpFailure) return error.status === 408 || error.status === 429 || (error.status >= 500 && error.status <= 599 && error.status !== 567);
  return error instanceof TypeError || (error instanceof Error && error.name === 'TimeoutError');
}
function retryDelay(value: string | null, attempt: number) {
  const seconds = value === null ? NaN : Number(value);
  const requested = Number.isFinite(seconds) ? seconds * 1000 : value ? Date.parse(value) - Date.now() : NaN;
  return Math.min(10000, Math.max(1000 * (attempt === 0 ? 1 : 3), Number.isFinite(requested) ? requested : 0));
}

// The deadline covers both response headers and body; every retry has a fresh deadline.
export async function requestJson(url: string, options: RequestOptions = {}): Promise<unknown> {
  const { signal, fetcher = fetch, timeoutMs = 15000, wait = (ms, abort) => delay(ms, undefined, { signal: abort }) } = options;
  for (let attempt = 0; attempt < 3; attempt++) {
    signal?.throwIfAborted();
    const controller = new AbortController();
    const abort = () => controller.abort(signal?.reason);
    signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => controller.abort(new DOMException('官方请求超时', 'TimeoutError')), timeoutMs);
    let error: unknown;
    let after: string | null = null;
    try {
      const response = await fetcher(url, { signal: controller.signal, credentials: 'omit', cache: 'no-store' });
      if (!response.ok) {
        after = response.headers.get('retry-after');
        await response.body?.cancel();
        throw new HttpFailure(response.status);
      }
      return await response.json();
    } catch (caught) {
      error = controller.signal.aborted ? controller.signal.reason : caught;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
    signal?.throwIfAborted();
    if (attempt === 2 || !transient(error)) throw error;
    console.warn(`官方请求暂时失败，准备第 ${attempt + 2}/3 次尝试：${String(error)}`);
    await wait(retryDelay(after, attempt), signal);
  }
  throw new Error('官方请求未完成');
}

export function parseFujianHistory(payload: unknown): WinningDraw[] {
  if (!payload || typeof payload !== 'object' || !('code' in payload) || payload.code !== 0 || !('data' in payload)) throw new Error('福建官方开奖接口返回失败');
  if (!Array.isArray(payload.data) || payload.data.some(row => !row || typeof row !== 'object' || !('verify' in row) || String(row.verify) !== '1')) throw new Error('福建官方数据尚未审核');
  const draws = parseOfficialHistory({ success: true, errorCode: '0', value: { list: payload.data } });
  if (draws.length !== DRAW_COUNT) throw new Error('福建官方历史开奖期数不足');
  return draws;
}

export function assertCompatibleDraws(incoming: WinningDraw[], current: WinningDraw[]) {
  if (incoming.length !== DRAW_COUNT || Number(incoming[0].period) < Number(current[0].period)) throw new Error('官方响应早于已保存的开奖或期数不足');
  for (let i = 1; i < incoming.length; i++) {
    const newer = incoming[i - 1].period;
    const older = incoming[i].period;
    const sameYear = newer.slice(0, 2) === older.slice(0, 2);
    if (sameYear ? Number(newer) - Number(older) !== 1 : Number(newer.slice(0, 2)) - Number(older.slice(0, 2)) !== 1 || newer.slice(2) !== '001') throw new Error('官方历史开奖期号不连续');
  }
  const byPeriod = new Map(incoming.map(draw => [draw.period, draw]));
  const oldest = Number(incoming.at(-1)!.period);
  for (const saved of current) {
    if (Number(saved.period) < oldest) continue;
    const draw = byPeriod.get(saved.period);
    if (!draw || draw.date !== saved.date || String(draw.front) !== String(saved.front) || String(draw.back) !== String(saved.back)) throw new Error(`第 ${saved.period} 期官方响应与已核验记录不一致`);
  }
}

export async function fetchVerifiedDraws(current: DrawSnapshot, options: RequestOptions = {}): Promise<DrawSnapshot> {
  const sources = [
    { id: 'china-sporttery', url: OFFICIAL_HISTORY_URL, parse: parseOfficialHistory },
    { id: 'fujian-sporttery', url: FUJIAN_HISTORY_URL, parse: parseFujianHistory },
  ] as const;
  const failures: string[] = [];
  for (const source of sources) {
    options.signal?.throwIfAborted();
    try {
      const draws = source.parse(await requestJson(source.url, options));
      assertCompatibleDraws(draws, current.draws);
      console.log(`官方采集成功：${source.id}，最近 ${draws.length} 期，最新 ${draws[0].period}`);
      return { fetchedAt: new Date().toISOString(), source: source.id, draws };
    } catch (error) {
      options.signal?.throwIfAborted();
      failures.push(`${source.id}: ${error instanceof Error ? error.message : String(error)}`);
      console.warn(`官方源未通过核验：${failures.at(-1)}`);
    }
  }
  throw new Error(`所有官方数据源均未成功：${failures.join('；')}`);
}
