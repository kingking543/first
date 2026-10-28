export interface LottoSet {
  id: string;
  front: number[];
  back: number[];
  timestamp: number;
  isSmart?: boolean;
  score?: number;
}

export const GENERATED_HISTORY_KEY = 'lotto_history';
export const HISTORY_LIMIT = 50;

export function buildHotNumbers(data: { number: number; freq: number }[]): ReadonlySet<number> {
  return new Set([...data].sort((a, b) => b.freq - a.freq).slice(0, 10).map(item => item.number));
}

export function scoreFrontNumbers(front: number[], hot: ReadonlySet<number>): number {
  let score = 0;
  const sum = front.reduce((a, b) => a + b, 0);
  if (sum >= 70 && sum <= 120) score += 30;
  else if (sum >= 50 && sum <= 140) score += 15;
  const oddCount = front.filter(number => number % 2 !== 0).length;
  score += oddCount === 2 || oddCount === 3 ? 25 : 10;
  const hotCount = front.filter(number => hot.has(number)).length;
  score += hotCount >= 2 && hotCount <= 3 ? 25 : 10;
  let consecutive = 0;
  for (let i = 1; i < front.length; i++) if (front[i] - front[i - 1] === 1) consecutive++;
  if (consecutive <= 1) score += 20;
  return score;
}

function sampleNumbers(count: number, maximum: number, random: () => number): number[] {
  const pool = Array.from({ length: maximum }, (_, i) => i + 1);
  // Partial Fisher-Yates: bounded work, with uniform sampling without replacement.
  for (let i = 0; i < count; i++) {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('Random value must be in [0, 1)');
    const target = i + Math.floor(value * (maximum - i));
    [pool[i], pool[target]] = [pool[target], pool[i]];
  }
  return pool.slice(0, count).sort((a, b) => a - b);
}

export function generateLottoSets(count: number, smart: boolean, hot: ReadonlySet<number>, random = Math.random): LottoSet[] {
  if (!Number.isInteger(count) || count < 1 || count > HISTORY_LIMIT) throw new RangeError('Generate between 1 and 50 sets');
  return Array.from({ length: count }, (_, index) => {
    let best: { front: number[]; back: number[]; score: number } | undefined;
    for (let i = 0; i < (smart ? 100 : 1); i++) {
      const front = sampleNumbers(5, 35, random);
      const back = sampleNumbers(2, 12, random);
      const score = scoreFrontNumbers(front, hot);
      if (!best || score > best.score) best = { front, back, score };
      if (smart && score >= 90) break;
    }
    const timestamp = Date.now();
    const id = globalThis.crypto?.randomUUID?.() ?? timestamp.toString(36) + '-' + index + '-' + Math.random().toString(36).slice(2);
    return { ...best!, id, timestamp, isSmart: smart };
  });
}

function validZone(value: unknown, count: number, maximum: number): value is number[] {
  return Array.isArray(value) && value.length === count && new Set(value).size === count &&
    value.every(n => Number.isInteger(n) && n >= 1 && n <= maximum);
}

function isLottoSet(value: unknown): value is LottoSet {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<LottoSet>;
  return typeof item.id === 'string' && item.id.length > 0 &&
    typeof item.timestamp === 'number' && Number.isFinite(item.timestamp) && item.timestamp > 0 &&
    validZone(item.front, 5, 35) && validZone(item.back, 2, 12) &&
    (item.isSmart === undefined || typeof item.isSmart === 'boolean') &&
    (item.score === undefined || (typeof item.score === 'number' && Number.isFinite(item.score) && item.score >= 0 && item.score <= 100));
}

export function parseGeneratedHistory(saved: string | null): LottoSet[] {
  try {
    const data: unknown = JSON.parse(saved ?? '[]');
    if (!Array.isArray(data)) return [];
    const ids = new Set<string>();
    return data.filter((item): item is LottoSet => {
      if (!isLottoSet(item) || ids.has(item.id)) return false;
      ids.add(item.id);
      return true;
    }).slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export function appendGeneratedHistory(history: LottoSet[], sets: LottoSet[]): LottoSet[] {
  return [...sets, ...history].slice(0, HISTORY_LIMIT);
}

export function formatLottoSet(set: LottoSet): string {
  return `前区: ${set.front.join(', ')} | 后区: ${set.back.join(', ')}`;
}
