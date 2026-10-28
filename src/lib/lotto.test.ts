import assert from 'node:assert/strict';
import test from 'node:test';
import { appendGeneratedHistory, buildHotNumbers, formatLottoSet, generateLottoSets, parseGeneratedHistory, scoreFrontNumbers } from './lotto.ts';
import type { LottoSet } from './lotto.ts';

const saved: LottoSet = { id: 'saved', front: [5, 12, 18, 24, 31], back: [4, 9], timestamp: 1700000000000, isSmart: true, score: 100 };
const hot = new Set([5, 12, 18, 24, 31, 2, 8, 15, 22, 33]);

test('retains the existing sum, odd/even, hot/cold and consecutive scoring rules', () => {
  assert.equal(scoreFrontNumbers([5, 12, 18, 24, 31], new Set([5, 12])), 100);
  assert.equal(scoreFrontNumbers([5, 12, 18, 24, 31], hot), 85);
  assert.equal(scoreFrontNumbers([1, 2, 3, 4, 5], new Set([1, 2, 3])), 50);
  assert.equal(scoreFrontNumbers([1, 3, 5, 7, 9], new Set()), 40);
});

test('builds a reusable top-ten hot-number lookup', () => {
  const numbers = buildHotNumbers(Array.from({ length: 35 }, (_, i) => ({ number: i + 1, freq: i + 1 === 24 ? 100 : i + 1 })));
  assert.equal(numbers.size, 10);
  assert.equal(numbers.has(24), true);
  assert.equal(numbers.has(35), true);
  assert.equal(numbers.has(1), false);
});

test('generates unique sorted in-range zones even for a constant random source', () => {
  const sets = generateLottoSets(1, false, hot, () => 0);
  assert.equal(sets.length, 1);
  assert.deepEqual(sets[0].front, [1, 2, 3, 4, 5]);
  assert.deepEqual(sets[0].back, [1, 2]);
  assert.equal(sets[0].isSmart, false);
});

test('generates five independent records and retains smart-mode rule scores', () => {
  let seed = 42;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const sets = generateLottoSets(5, true, hot, random);
  assert.equal(sets.length, 5);
  assert.equal(new Set(sets.map(s => s.id)).size, 5);
  for (const set of sets) {
    assert.equal(set.score, 100);
    assert.equal(set.isSmart, true);
    assert.equal(set.front.length, 5);
    assert.equal(new Set(set.front).size, 5);
    assert.ok(set.front.every((n, i) => n >= 1 && n <= 35 && (i === 0 || n > set.front[i - 1])));
    assert.equal(set.back.length, 2);
    assert.ok(set.back[0] >= 1 && set.back[1] <= 12 && set.back[0] < set.back[1]);
  }
});

test('rejects unsupported generation counts', () => {
  for (const count of [0, -1, 1.5, 51]) assert.throws(() => generateLottoSets(count, false, hot));
});

test('loads existing lotto_history records without changing valid data', () => {
  assert.deepEqual(parseGeneratedHistory(JSON.stringify([saved])), [saved]);
});

test('ignores corrupted or invalid history while preserving valid records', () => {
  for (const value of [null, '{broken', 'null', '{}']) assert.deepEqual(parseGeneratedHistory(value), []);
  assert.deepEqual(parseGeneratedHistory(JSON.stringify([null, saved, { ...saved, id: 'bad', front: [1, 1, 3, 4, 5] }, { id: 'partial' }])), [saved]);
});

test('caps history at 50 without mutating the previous records', () => {
  const previous = Array.from({ length: 50 }, (_, i) => ({ ...saved, id: 'old-' + i }));
  const combined = appendGeneratedHistory(previous, [{ ...saved, id: 'new' }]);
  assert.equal(combined.length, 50);
  assert.equal(combined[0].id, 'new');
  assert.equal(combined.at(-1)?.id, 'old-48');
  assert.equal(previous.length, 50);
  assert.equal(previous[0].id, 'old-0');
  assert.equal(parseGeneratedHistory(JSON.stringify([...previous, { ...saved, id: 'extra' }])).length, 50);
});

test('preserves the existing copy format', () => {
  assert.equal(formatLottoSet(saved), '前区: 5, 12, 18, 24, 31 | 后区: 4, 9');
});

test('generation remains available when randomUUID is absent in an older or non-secure browser', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined });
  try {
    const sets = generateLottoSets(1, false, hot, () => 0);
    assert.equal(sets.length, 1);
    assert.ok(sets[0].id.length > 0);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'crypto', descriptor);
    else Reflect.deleteProperty(globalThis, 'crypto');
  }
});
