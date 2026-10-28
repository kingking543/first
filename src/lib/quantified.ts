import { sampleNumbers, unitRandom } from './number-sampling.ts';
import type { LottoSet } from './lotto.ts';
type Numbers = Pick<LottoSet, 'front' | 'back'>;
const overlap = (left: number[], right: number[]) => left.filter(number => right.includes(number)).length;
function individualRulePoints(front: number[], hot: ReadonlySet<number>) {
  const sorted = [...front].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const odd = sorted.filter(number => number % 2 !== 0).length;
  const consecutive = sorted.slice(1).filter((number, i) => number - sorted[i] === 1).length;
  const hotCount = sorted.filter(number => hot.has(number)).length;
  return Math.max(0, 30 - 0.4 * Math.abs(sum - 90)) +
    (odd === 2 || odd === 3 ? 25 : odd === 1 || odd === 4 ? 16 : 8) +
    (consecutive <= 1 ? 20 : consecutive === 2 ? 12 : 4) +
    (hotCount >= 1 && hotCount <= 3 ? 5 : 2);
}
export function scoreRuleConformity(set: Numbers, hot: ReadonlySet<number>, others: Numbers[] = []): number {
  const maxFront = Math.max(0, ...others.map(other => overlap(set.front, other.front)));
  const maxBack = Math.max(0, ...others.map(other => overlap(set.back, other.back)));
  const spread = Math.max(0, 20 - 3 * maxFront - 3 * maxBack);
  return Math.round(individualRulePoints(set.front, hot) + spread);
}
const key = (set: Numbers) => set.front.join(',') + '|' + set.back.join(',');

export function selectQuantified(count: number, hot: ReadonlySet<number>, random: () => number): Numbers[] {
  const unique = new Map<string, Numbers>();
  for (let i = 0; i < Math.max(160, count * 48); i++) {
    const set = { front: sampleNumbers(5, 35, random), back: sampleNumbers(2, 12, random) };
    unique.set(key(set), set);
  }
  // Bounded fallback for an unusually repetitive random source.
  for (let i = 0; unique.size < count && i < count * 12; i++) {
    const front = Array.from({ length: 5 }, (_, j) => (i + j) % 35 + 1).sort((a, b) => a - b);
    const back = [i % 12 + 1, (i + 1) % 12 + 1].sort((a, b) => a - b);
    unique.set(key({ front, back }), { front, back });
  }
  const candidates = [...unique.values()];
  const selected: Numbers[] = [];
  const usedFront = new Set<number>(), usedBack = new Set<number>();
  while (selected.length < count) {
    const weights = candidates.map(candidate => {
      const newFront = candidate.front.filter(number => !usedFront.has(number)).length;
      const newBack = candidate.back.filter(number => !usedBack.has(number)).length;
      const maxFront = Math.max(0, ...selected.map(other => overlap(candidate.front, other.front)));
      const maxBack = Math.max(0, ...selected.map(other => overlap(candidate.back, other.back)));
      // All candidates have positive weight; score is a preference, never a stop threshold.
      const preference = 0.75 + 0.5 * individualRulePoints(candidate.front, hot) / 80;
      const diversity = selected.length ? Math.exp(0.9 * newFront + 1.1 * newBack - 0.45 * maxFront - 0.55 * maxBack) : 1;
      return preference * diversity;
    });
    let target = unitRandom(random) * weights.reduce((a, b) => a + b, 0);
    let index = weights.length - 1;
    for (let i = 0; i < weights.length; i++) {
      target -= weights[i];
      if (target < 0) { index = i; break; }
    }
    const [set] = candidates.splice(index, 1);
    selected.push(set);
    set.front.forEach(number => usedFront.add(number));
    set.back.forEach(number => usedBack.add(number));
  }
  return selected;
}
