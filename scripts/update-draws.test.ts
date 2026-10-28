import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

function fixture(latest: number) {
  return {
    fetchedAt: '2026-03-01T00:00:00.000Z',
    draws: Array.from({ length: 50 }, (_, i) => ({
      period: String(26000 + latest - i),
      date: new Date(Date.UTC(2026, 0, latest - i)).toISOString().slice(0, 10),
      front: [1, 2, 3, 4, 5], back: [1, 2],
    })),
  };
}

async function runUpdate(current: number, official: number, published?: number, publishedStatus = 200) {
  const dir = await mkdtemp(join(tmpdir(), 'dlt-updater-test-'));
  try {
    for (const path of ['scripts', 'src/lib', 'src/data']) await mkdir(join(dir, path), { recursive: true });
    for (const path of ['scripts/update-draws.ts', 'src/lib/draws.ts']) await copyFile(new URL('../' + path, import.meta.url), join(dir, path));
    await writeFile(join(dir, 'package.json'), '{"type":"module"}');
    await writeFile(join(dir, 'src/data/official-draws.json'), JSON.stringify(fixture(current)));
    const response = { success: true, errorCode: '0', value: { list: fixture(official).draws.map(d => ({
      lotteryGameNum: '85', lotteryDrawNum: d.period, lotteryDrawTime: d.date,
      lotteryDrawResult: [...d.front, ...d.back].map(n => String(n).padStart(2, '0')).join(' '),
    })) } };
    await writeFile(join(dir, 'responses.json'), JSON.stringify({ official: response, published: fixture(published ?? current), publishedStatus }));
    await writeFile(join(dir, 'network.mjs'), `import {readFileSync} from 'node:fs';
const data=JSON.parse(readFileSync(new URL('./responses.json',import.meta.url),'utf8'));
globalThis.fetch=async url=>{
 if(String(url).includes('webapi.sporttery.cn')) return new Response(JSON.stringify(data.official));
 if(String(url)==='https://example.test/first/data/official-draws.json') return new Response(JSON.stringify(data.published),{status:data.publishedStatus});
 throw new Error('Unexpected external URL');
};`);
    const result = spawnSync(process.execPath, [
      '--import', fileURLToPath(new URL('../node_modules/tsx/dist/loader.mjs', import.meta.url)),
      '--import', join(dir, 'network.mjs'), join(dir, 'scripts/update-draws.ts'),
    ], { cwd: dir, encoding: 'utf8', env: { ...process.env, DRAW_PUBLISHED_URL: published === undefined ? '' : 'https://example.test/first/data/official-draws.json' } });
    return { exit: result.status, saved: JSON.parse(await readFile(join(dir, 'src/data/official-draws.json'), 'utf8')) };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('updater refuses responses older than its local snapshot', async () => {
  const result = await runUpdate(52, 51);
  assert.equal(result.exit, 1);
  assert.equal(result.saved.draws[0].period, '26052');
});

test('updater refuses deployment downgrade when published data is newer than Git', async () => {
  const result = await runUpdate(50, 52, 53);
  assert.equal(result.exit, 1);
  assert.equal(result.saved.draws[0].period, '26050');
});

test('updater accepts results newer than both local and published snapshots', async () => {
  const result = await runUpdate(50, 54, 53);
  assert.equal(result.exit, 0);
  assert.equal(result.saved.draws[0].period, '26054');
});

test('updater stops when published baseline cannot be verified', async () => {
  const result = await runUpdate(50, 54, 53, 503);
  assert.equal(result.exit, 1);
  assert.equal(result.saved.draws[0].period, '26050');
});

test('updater allows the first deployment when no published snapshot exists', async () => {
  const result = await runUpdate(50, 54, 53, 404);
  assert.equal(result.exit, 0);
  assert.equal(result.saved.draws[0].period, '26054');
});
