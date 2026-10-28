import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { calculateDrawStats, fetchOfficialSnapshot, parseOfficialHistory, parseSnapshot, selectSnapshot, snapshotFreshness, DRAW_SOURCES } from './draws.ts';

const recent = { lotteryGameNum: '85', lotteryDrawNum: '26122', lotteryDrawTime: '2026-10-26', lotteryDrawResult: '02 14 21 22 24 02 12' };
const previous = { lotteryGameNum: '85', lotteryDrawNum: '26121', lotteryDrawTime: '2026-10-24', lotteryDrawResult: '06 08 19 24 25 01 08' };
const response = (list: unknown[]) => ({ success: true, errorCode: '0', value: { list } });
const payload = (rows = [recent, previous]) => ({ fetchedAt: '2026-10-28T09:13:12.000Z', draws: rows.map(r => ({ period: r.lotteryDrawNum, date: r.lotteryDrawTime, front: r.lotteryDrawResult.split(' ').slice(0, 5).map(Number), back: r.lotteryDrawResult.split(' ').slice(5).map(Number) })) });

test('normalizes official results and sorts newest first without mixing zones', () => {
  const draws = parseOfficialHistory(response([previous, recent]));
  assert.deepEqual(draws[0], { period: '26122', date: '2026-10-26', front: [2, 14, 21, 22, 24], back: [2, 12] });
  assert.equal(draws[1].period, '26121');
});

test('rejects unsuccessful, empty, and wrong-game official responses', () => {
  for (const data of [{ ...response([recent]), success: false }, response([]), response([{ ...recent, lotteryGameNum: '35' }])]) {
    assert.throws(() => parseOfficialHistory(data));
  }
});

test('rejects duplicate, missing, out-of-range, and non-integer balls', () => {
  for (const result of ['02 02 21 22 24 02 12', '00 14 21 22 24 02 12', '02 14 21 22 36 02 12', '02 14 21 22 24 02 13', '02 14 21 22 24 02 02', '02 14 21 22 24 02', '2.5 14 21 22 24 02 12']) {
    assert.throws(() => parseOfficialHistory(response([{ ...recent, lotteryDrawResult: result }])));
  }
});

test('rejects duplicate periods, impossible dates, and mismatched period years', () => {
  for (const rows of [[recent, recent], [{ ...recent, lotteryDrawTime: '2026-02-30' }], [{ ...recent, lotteryDrawNum: '25122' }]]) {
    assert.throws(() => parseOfficialHistory(response(rows)));
  }
});

test('computes frequencies and overdue counts from newest-first draws', () => {
  const stats = calculateDrawStats(parseOfficialHistory(response([recent, previous])));
  assert.equal(stats.frontData.find(d => d.number === 24)?.freq, 2);
  assert.equal(stats.frontData.find(d => d.number === 24)?.overdue, 0);
  assert.equal(stats.frontData.find(d => d.number === 6)?.overdue, 1);
  assert.equal(stats.frontData.find(d => d.number === 35)?.overdue, 2);
  assert.equal(stats.backData.find(d => d.number === 12)?.freq, 1);
  assert.equal(stats.frontData.reduce((sum, d) => sum + d.freq, 0), 10);
  assert.equal(stats.backData.reduce((sum, d) => sum + d.freq, 0), 4);
});

test('rejects corrupted snapshots and invalid retrieval timestamps', () => {
  assert.throws(() => parseSnapshot({ ...payload(), fetchedAt: 'not-a-date' }));
  const bad = payload(); bad.draws[0].front = [2, 2, 21, 22, 24];
  assert.throws(() => parseSnapshot(bad));
});

test('keeps newer real data instead of older or corrupt saved data', () => {
  const bundled = parseSnapshot(payload());
  const older = payload([previous]); older.fetchedAt = '2026-10-28T12:00:00.000Z';
  assert.equal(selectSnapshot(bundled, JSON.stringify(older)).draws[0].period, '26122');
  assert.equal(selectSnapshot(bundled, '{broken'), bundled);
  assert.equal(selectSnapshot(bundled, null), bundled);
  const newer = parseSnapshot({ ...payload(), fetchedAt: '2026-10-28T12:00:00.000Z' });
  assert.equal(selectSnapshot(bundled, JSON.stringify(newer)).fetchedAt, '2026-10-28T12:00:00.000Z');
});

test('rejects HTTP errors and incomplete history instead of accepting them as a full window', async () => {
  const reply = (data: unknown, status = 200) => (async () => new Response(JSON.stringify(data), { status })) as typeof fetch;
  await assert.rejects(fetchOfficialSnapshot(undefined, reply(response([recent, previous]), 503)));
  await assert.rejects(fetchOfficialSnapshot(undefined, reply(response([recent, previous]))));
});

test('rejects older cached data even when its retrieval timestamp is newer', () => {
  const bundled = parseSnapshot(payload());
  const older = payload([previous, { ...previous, lotteryDrawNum: '26120', lotteryDrawTime: '2026-10-21', lotteryDrawResult: '01 06 10 15 32 03 04' }]);
  older.fetchedAt = '2026-10-28T12:00:00.000Z';
  assert.equal(selectSnapshot(bundled, JSON.stringify(older)), bundled);
});

test('bundled official snapshot contains a complete valid 50-draw window', () => {
  const saved = parseSnapshot(JSON.parse(readFileSync(new URL('../data/official-draws.json', import.meta.url), 'utf8')));
  assert.equal(saved.draws.length, 50);
  const stats = calculateDrawStats(saved.draws);
  assert.equal(stats.frontFreq.reduce((a, b) => a + b, 0), 250);
  assert.equal(stats.backFreq.reduce((a, b) => a + b, 0), 100);
});

test('ignores caches that change the configured analysis window size', () => {
  const bundled = parseSnapshot(payload());
  const oversized = payload([recent, previous, { ...previous, lotteryDrawNum: '26120', lotteryDrawTime: '2026-10-21', lotteryDrawResult: '01 06 10 15 32 03 04' }]);
  oversized.fetchedAt = '2026-10-28T12:00:00.000Z';
  assert.equal(selectSnapshot(bundled, JSON.stringify(oversized)), bundled);
});


test('old snapshots keep central attribution and unknown sources are rejected', () => {
  assert.equal(parseSnapshot(payload()).source, 'china-sporttery');
  assert.equal(parseSnapshot({ ...payload(), source: 'fujian-sporttery' }).source, 'fujian-sporttery');
  assert.equal(DRAW_SOURCES['fujian-sporttery'].name, '福建体彩网');
  assert.throws(() => parseSnapshot({ ...payload(), source: 'untrusted' }));
});

test('freshness follows official verification time, including exact boundary and clock skew', () => {
  const snapshot = parseSnapshot(payload()); const fetched = Date.parse(snapshot.fetchedAt);
  assert.equal(snapshotFreshness(snapshot, fetched + 36 * 3600000 - 1), 'fresh');
  assert.equal(snapshotFreshness(snapshot, fetched + 36 * 3600000), 'stale');
  assert.equal(snapshotFreshness(snapshot, fetched - 5 * 60000), 'fresh');
  assert.equal(snapshotFreshness(snapshot, fetched - 5 * 60000 - 1), 'clock-error');
  assert.equal(snapshotFreshness(snapshot, fetched + 7 * 86400000), 'stale');
});


test('back-zone omission measures newest-first distance and caps unseen numbers at sample size', () => {
  const stats=calculateDrawStats(parseOfficialHistory(response([recent,previous])));
  assert.equal(stats.backData.find(row=>row.number===12)?.overdue,0);
  assert.equal(stats.backData.find(row=>row.number===8)?.overdue,1);
  assert.equal(stats.backData.find(row=>row.number===3)?.overdue,2);
});
