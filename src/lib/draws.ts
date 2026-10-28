export interface WinningDraw {
  period: string;
  date: string;
  front: number[];
  back: number[];
}

export interface DrawSnapshot {
  fetchedAt: string;
  draws: WinningDraw[];
}

export const DRAW_COUNT = 50;
export const DRAW_CACHE_KEY = 'dlt_official_draws_v1';
export const OFFICIAL_SOURCE_URL = 'https://www.lottery.gov.cn/kj/kjlb.html?dlt';
export const OFFICIAL_HISTORY_URL = 'https://webapi.sporttery.cn/gateway/lottery/getHistoryPageListV1.qry?gameNo=85&provinceId=0&pageSize=50&isVerify=1&pageNo=1';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('开奖数据格式错误');
  return value as Record<string, unknown>;
}

function balls(value: unknown, count: number, maximum: number): number[] {
  if (!Array.isArray(value) || value.length !== count || new Set(value).size !== count ||
      value.some(n => !Number.isInteger(n) || n < 1 || n > maximum)) {
    throw new Error('开奖号码不合法');
  }
  return [...value].sort((a, b) => a - b);
}

function normalizeDraws(value: unknown): WinningDraw[] {
  if (!Array.isArray(value) || !value.length) throw new Error('没有可用的开奖记录');
  const periods = new Set<string>();
  const draws = value.map(item => {
    const draw = record(item);
    const { period, date } = draw;
    if (typeof period !== 'string' || !/^\d{5}$/.test(period) ||
        Number(period.slice(2)) < 1 || Number(period.slice(2)) > 366 || periods.has(period)) {
      throw new Error('开奖期号重复或不合法');
    }
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date ||
        date.slice(2, 4) !== period.slice(0, 2)) {
      throw new Error('开奖日期不合法');
    }
    periods.add(period);
    return { period, date, front: balls(draw.front, 5, 35), back: balls(draw.back, 2, 12) };
  }).sort((a, b) => Number(b.period) - Number(a.period));
  if (draws.some((draw, i) => i > 0 && draw.date >= draws[i - 1].date)) {
    throw new Error('开奖日期与期号顺序不一致');
  }
  return draws;
}

export function parseOfficialHistory(payload: unknown): WinningDraw[] {
  const data = record(payload);
  if (data.success !== true || String(data.errorCode) !== '0') throw new Error('官方开奖接口返回失败');
  const list = record(data.value).list;
  if (!Array.isArray(list)) throw new Error('官方开奖列表格式错误');
  return normalizeDraws(list.map(item => {
    const draw = record(item);
    if (draw.lotteryGameNum !== '85' || typeof draw.lotteryDrawResult !== 'string') {
      throw new Error('官方数据彩种或号码格式错误');
    }
    const numbers = draw.lotteryDrawResult.trim().split(/\s+/);
    if (numbers.length !== 7 || numbers.some(n => !/^\d{1,2}$/.test(n))) throw new Error('开奖号码格式错误');
    return {
      period: draw.lotteryDrawNum,
      date: draw.lotteryDrawTime,
      front: numbers.slice(0, 5).map(Number),
      back: numbers.slice(5).map(Number),
    };
  }));
}

export function parseSnapshot(payload: unknown): DrawSnapshot {
  const data = record(payload);
  if (typeof data.fetchedAt !== 'string' || !Number.isFinite(Date.parse(data.fetchedAt))) {
    throw new Error('开奖数据更新时间不合法');
  }
  return { fetchedAt: data.fetchedAt, draws: normalizeDraws(data.draws) };
}

export function selectSnapshot(current: DrawSnapshot, saved: string | null): DrawSnapshot {
  try {
    if (!saved) return current;
    const candidate = parseSnapshot(JSON.parse(saved));
    if (candidate.draws.length !== current.draws.length) return current;
    const periodDiff = Number(candidate.draws[0].period) - Number(current.draws[0].period);
    return periodDiff > 0 || (periodDiff === 0 && Date.parse(candidate.fetchedAt) > Date.parse(current.fetchedAt))
      ? candidate : current;
  } catch {
    return current;
  }
}

export async function fetchOfficialSnapshot(signal?: AbortSignal, fetcher: typeof fetch = fetch): Promise<DrawSnapshot> {
  const response = await fetcher(OFFICIAL_HISTORY_URL, { signal, credentials: 'omit', cache: 'no-store' });
  if (!response.ok) throw new Error(`官方开奖接口暂不可用 (HTTP ${response.status})`);
  const draws = parseOfficialHistory(await response.json());
  if (draws.length !== DRAW_COUNT) throw new Error('官方返回的历史开奖期数不足');
  return { fetchedAt: new Date().toISOString(), draws };
}

export function calculateDrawStats(draws: WinningDraw[]) {
  const frontFreq = Array<number>(36).fill(0);
  const backFreq = Array<number>(13).fill(0);
  const frontOverdue = Array<number>(36).fill(draws.length);
  draws.forEach((draw, index) => {
    draw.front.forEach(number => {
      frontFreq[number]++;
      if (frontOverdue[number] === draws.length) frontOverdue[number] = index;
    });
    draw.back.forEach(number => backFreq[number]++);
  });
  return {
    frontData: Array.from({ length: 35 }, (_, i) => ({ number: i + 1, freq: frontFreq[i + 1], overdue: frontOverdue[i + 1] })),
    backData: Array.from({ length: 12 }, (_, i) => ({ number: i + 1, freq: backFreq[i + 1] })),
    frontFreq,
    backFreq,
  };
}

export async function fetchPublishedSnapshot(url: string, signal?: AbortSignal, fetcher: typeof fetch = fetch): Promise<DrawSnapshot> {
  const response = await fetcher(url, { signal, credentials: 'omit', cache: 'no-store' });
  if (!response.ok) throw new Error('站点开奖数据暂不可用');
  const snapshot = parseSnapshot(await response.json());
  if (snapshot.draws.length !== DRAW_COUNT) throw new Error('站点历史开奖期数不完整');
  return snapshot;
}

export type DrawStats = ReturnType<typeof calculateDrawStats>;
export type DrawLoadStatus = 'syncing' | 'live' | 'saved';
