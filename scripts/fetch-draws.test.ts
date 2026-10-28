import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { fetchVerifiedDraws, requestJson, parseFujianHistory, assertCompatibleDraws } from './fetch-draws.ts';
import { parseSnapshot, OFFICIAL_HISTORY_URL } from '../src/lib/draws.ts';

const baseline = parseSnapshot(JSON.parse(readFileSync(new URL('../src/data/official-draws.json', import.meta.url), 'utf8')));
const rows = baseline.draws.map(d => ({ verify: '1', lotteryGameNum: '85', lotteryDrawNum: d.period, lotteryDrawTime: d.date, lotteryDrawResult: [...d.front, ...d.back].join(' ') }));
const central = { success: true, errorCode: '0', value: { list: rows } };
const fujian = { code: 0, data: rows };
const noWait = async () => {};
const reply = (payload: unknown, status = 200) => new Response(JSON.stringify(payload), { status });

test('transient failures retry up to three attempts and respect bounded Retry-After', async () => {
  let calls = 0;
  const waits: number[] = [];
  const result = await requestJson('https://example.test', { fetcher: async () => {
    calls++;
    return calls < 3 ? new Response('', { status: calls === 1 ? 503 : 429, headers: { 'retry-after': '999' } }) : reply({ ok: true });
  }, wait: async ms => { waits.push(ms); } });
  assert.deepEqual(result, { ok: true });
  assert.equal(calls, 3);
  assert.deepEqual(waits, [10000, 10000]);
});

test('access blocks, malformed JSON, and permanent errors are not retried', async () => {
  for (const status of [401, 403, 404, 567, 200]) {
    let calls = 0;
    await assert.rejects(requestJson('https://example.test', { fetcher: async () => { calls++; return new Response('<html>unavailable</html>', { status }); }, wait: noWait }));
    assert.equal(calls, 1);
  }
});

test('request retries network errors and body timeouts but stops at three', async () => {
  let calls = 0;
  await assert.rejects(requestJson('https://example.test', { fetcher: async () => { calls++; throw new TypeError('fetch failed'); }, wait: noWait }));
  assert.equal(calls, 3);
  calls = 0;
  await assert.rejects(requestJson('https://example.test', { timeoutMs: 10, fetcher: async (_url, init) => {
    calls++;
    return { ok: true, json: () => new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true })) } as Response;
  }, wait: noWait }));
  assert.equal(calls, 3);
});

test('cancellation during backoff stops retries and source fallback', async () => {
  const controller = new AbortController(); let calls = 0;
  await assert.rejects(fetchVerifiedDraws(baseline, { signal: controller.signal, fetcher: async () => { calls++; return reply({}, 503); }, wait: async () => { controller.abort(); } }));
  assert.equal(calls, 1);
});

test('Fujian official results share the full central validation', () => {
  assert.deepEqual(parseFujianHistory(fujian), baseline.draws);
  for (const bad of [{ code: 0, data: [{ ...rows[0], verify: '0' }, ...rows.slice(1)] }, { code: 1, data: rows }, { code: 0, data: rows.slice(0, 49) }, { code: 0, data: [{ ...rows[0], lotteryGameNum: '35' }, ...rows.slice(1)] }, { code: 0, data: [{ ...rows[0], lotteryDrawResult: '01 01 02 03 04 01 02' }, ...rows.slice(1)] }]) assert.throws(() => parseFujianHistory(bad));
});

test('strict collector falls back to Fujian when central API is blocked', async () => {
  const urls: string[] = [];
  const saved = await fetchVerifiedDraws(baseline, { fetcher: async url => { urls.push(String(url)); return String(url) === OFFICIAL_HISTORY_URL ? reply({}, 567) : reply(fujian); }, wait: noWait });
  assert.equal(saved.source, 'fujian-sporttery');
  assert.deepEqual(saved.draws, baseline.draws);
  assert.equal(urls.length, 2);
  assert.ok(Date.parse(saved.fetchedAt) > Date.parse(baseline.fetchedAt));
});

test('central success stays authoritative and records its actual source', async () => {
  let calls = 0;
  const saved = await fetchVerifiedDraws(baseline, { fetcher: async () => { calls++; return reply(central); }, wait: noWait });
  assert.equal(calls, 1);
  assert.equal(saved.source, 'china-sporttery');
});

test('conflicting overlapping numbers, missing periods and downgrade are rejected', async () => {
  const conflict = structuredClone(baseline); conflict.draws[0].front = [1, 2, 3, 4, 5];
  assert.throws(() => assertCompatibleDraws(conflict.draws, baseline.draws));
  assert.throws(() => assertCompatibleDraws(baseline.draws.slice(1), baseline.draws));
  const missing = structuredClone(baseline.draws); missing.splice(5, 1);
  assert.throws(() => assertCompatibleDraws(missing, baseline.draws));
  await assert.rejects(fetchVerifiedDraws(baseline, { fetcher: async () => reply({ code: 0, data: rows.map((r, i) => i === 0 ? { ...r, lotteryDrawResult: '01 02 03 04 05 01 02' } : r) }), wait: noWait }));
});


test('native fetch retries when response headers arrive but body exceeds the deadline', async () => {
  let requests = 0;
  const server = createServer((_req, res) => {
    requests++;
    res.writeHead(200, { 'content-type': 'application/json' });
    res.flushHeaders();
    res.write('{');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    await assert.rejects(requestJson(`http://127.0.0.1:${address.port}`, { timeoutMs: 150, wait: noWait }), { name: 'TimeoutError' });
    assert.equal(requests, 3);
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test('a complete-size response cannot hide a missing newly drawn period', () => {
  const gapped = [{ ...baseline.draws[0], period: '26124', date: '2026-10-31' }, ...baseline.draws.slice(0, 49)];
  assert.equal(gapped.length, 50);
  assert.throws(() => assertCompatibleDraws(gapped, baseline.draws));
});
