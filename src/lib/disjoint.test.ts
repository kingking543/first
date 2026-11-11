import assert from 'node:assert/strict';
import test from 'node:test';
import { generateLottoSets, parseGeneratedHistory } from './lotto.ts';
import { seededRandom } from '../../scripts/research/backtest-lib.ts';

const numbers = (sets: ReturnType<typeof generateLottoSets>) => sets.map(({front, back}) => ({front, back}));

test('smart batches from two to six tickets have no shared numbers in either zone', () => {
  for (const count of [2, 3, 4, 5, 6]) for (let seed = 1; seed <= 40; seed++) {
    const sets = generateLottoSets(count, true, new Set(), seededRandom(seed));
    assert.equal(new Set(sets.flatMap(s => s.front)).size, count * 5);
    assert.equal(new Set(sets.flatMap(s => s.back)).size, count * 2);
  }
});

test('constant RNG still produces five disjoint tickets with bounded work', () => {
  let calls = 0;
  const sets = generateLottoSets(5, true, new Set(), () => { calls++; return 0; });
  assert.equal(new Set(sets.flatMap(s => s.front)).size, 25);
  assert.equal(new Set(sets.flatMap(s => s.back)).size, 10);
  assert.ok(calls <= 70);
});

test('historical hot-number changes do not steer disjoint number selection', () => {
  for (const count of [1, 5, 6]) for (let seed = 1; seed <= 20; seed++) {
    const empty = generateLottoSets(count, true, new Set(), seededRandom(seed));
    const hot = generateLottoSets(count, true, new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), seededRandom(seed));
    assert.deepEqual(numbers(empty), numbers(hot));
  }
});

test('high numbers can appear in the first ticket instead of only the last groups', () => {
  const sets = generateLottoSets(5, true, new Set(), () => .999999);
  assert.ok(sets[0].front.includes(35));
  assert.ok(sets[0].back.includes(12));
});

test('six-ticket disjoint boundary and seven-ticket fallback retain legal records and saved scores', () => {
  for (const count of [6, 7, 50]) {
    const sets = generateLottoSets(count, true, new Set(), () => 0);
    assert.equal(sets.length, count);
    assert.equal(new Set(sets.map(s => s.front.join(',') + '|' + s.back.join(','))).size, count);
    for (const set of sets) {
      for (const [zone, size, maximum] of [[set.front, 5, 35], [set.back, 2, 12]] as const) {
        assert.equal(zone.length, size);
        assert.equal(new Set(zone).size, size);
        assert.ok(zone.every(n => Number.isInteger(n) && n >= 1 && n <= maximum));
        assert.deepEqual(zone, [...zone].sort((a, b) => a - b));
      }
    }
    assert.deepEqual(parseGeneratedHistory(JSON.stringify(sets)), sets);
  }
});
