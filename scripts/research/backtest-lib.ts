import { scoreFrontNumbers } from './baseline-lotto.ts';
import type { LottoSet } from './baseline-lotto.ts';
import type { WinningDraw } from '../../src/lib/draws.ts';

export function seededRandom(seed: number) {
  // Mulberry32; research reproducibility only, not cryptographic randomness.
  return () => {
    let value = seed += 0x6D2B79F5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
export function trialSeed(trial: number, period: string) {
  return (Math.imul(trial + 1, 0x9e3779b1) ^ Math.imul(Number(period), 0x85ebca6b) ^ 20261028) >>> 0;
}
export function historyBefore(ascending: WinningDraw[], index: number, size = 50) {
  if (index < size || index >= ascending.length) throw new RangeError('Insufficient prior history');
  return ascending.slice(index - size, index).reverse();
}
function sample(count: number, maximum: number, random: () => number) {
  const pool = Array.from({ length: maximum }, (_, i) => i + 1);
  for (let i = 0; i < count; i++) {
    const target = i + Math.floor(random() * (maximum - i));
    [pool[i], pool[target]] = [pool[target], pool[i]];
  }
  return pool.slice(0, count).sort((a, b) => a - b);
}
export function shapeOnly(count: number, random: () => number): Pick<LottoSet, 'front' | 'back'>[] {
  return Array.from({ length: count }, () => {
    let best: { front: number[]; back: number[]; score: number } | undefined;
    for (let i = 0; i < 100; i++) {
      const front = sample(5, 35, random), back = sample(2, 12, random);
      // Empty hot set always contributes10; replacing that term with25 removes
      // only the hot-number constraint and leaves the90-point stop reachable.
      const score = scoreFrontNumbers(front, new Set()) + 15;
      if (!best || score > best.score) best = { front, back, score };
      if (score >= 90) break;
    }
    return best!;
  });
}
export const METRICS = ['frontMean', 'backMean', 'anyFront3', 'anyBack2', 'joint3and1', 'frontCoverage', 'backCoverage', 'duplicateTickets', 'currentRule100'] as const;
export function measure(sets: Pick<LottoSet, 'front' | 'back'>[], draw: WinningDraw, hot: ReadonlySet<number>) {
  const frontHits = sets.map(s => s.front.filter(n => draw.front.includes(n)).length);
  const backHits = sets.map(s => s.back.filter(n => draw.back.includes(n)).length);
  const frontHistogram = Array<number>(6).fill(0), backHistogram = Array<number>(3).fill(0);
  frontHits.forEach(n => frontHistogram[n]++); backHits.forEach(n => backHistogram[n]++);
  const total = sets.length;
  return {
    values: [frontHits.reduce((a, b) => a + b, 0) / total, backHits.reduce((a, b) => a + b, 0) / total,
      Number(frontHits.some(n => n >= 3)), Number(backHits.some(n => n === 2)),
      frontHits.filter((n, i) => n >= 3 && backHits[i] >= 1).length / total,
      new Set(sets.flatMap(s => s.front)).size, new Set(sets.flatMap(s => s.back)).size,
      total - new Set(sets.map(s => s.front.join(',') + '|' + s.back.join(','))).size,
      sets.filter(s => scoreFrontNumbers(s.front, hot) === 100).length / total],
    frontHistogram, backHistogram,
  };
}
