import { sampleNumbers } from './number-sampling.ts';
import { selectQuantified, scoreRuleConformity } from './quantified.ts';
export { scoreRuleConformity };
let fallbackId = 0;

export interface LottoSet {
  id: string;
  front: number[];
  back: number[];
  timestamp: number;
  isSmart?: boolean;
  score?: number;
  scoreVersion?: 2;
}

export const GENERATED_HISTORY_KEY = 'lotto_history';
export const HISTORY_LIMIT = 50;

export function buildHotNumbers(data: { number: number; freq: number }[]): ReadonlySet<number> {
  return new Set([...data].sort((a, b) => b.freq - a.freq).slice(0, 10).map(item => item.number));
}

export function generateLottoSets(count: number, smart: boolean, hot: ReadonlySet<number>, random = Math.random): LottoSet[] {
  if (!Number.isInteger(count) || count < 1 || count > HISTORY_LIMIT) throw new RangeError('Generate between 1 and 50 sets');
  const numbers = smart ? selectQuantified(count, hot, random) : Array.from({ length: count }, () => ({ front: sampleNumbers(5, 35, random), back: sampleNumbers(2, 12, random) }));
  return numbers.map(set => {
    const timestamp = Date.now();
    const id = globalThis.crypto?.randomUUID?.() ?? `${timestamp.toString(36)}-${++fallbackId}`;
    return { ...set, id, timestamp, isSmart: smart, score: scoreRuleConformity(set, hot, numbers.filter(other => other !== set)), scoreVersion: 2 };
  });
}
export function scoreLabel(set: Pick<LottoSet, 'score' | 'scoreVersion'>) {
  return set.scoreVersion === 2 ? `规则符合度：${set.score}分（非中奖概率）` : `历史量化评分：${set.score}分（旧规则）`;
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
    }).slice(0, HISTORY_LIMIT).map(item => {
      const { scoreVersion, ...base } = item;
      return scoreVersion === 2 ? { ...base, scoreVersion: 2 as const } : base;
    });
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
