import { readFile, writeFile } from 'node:fs/promises';
import { DRAW_COUNT, parseSnapshot, selectSnapshot } from '../src/lib/draws.ts';

import { assertCompatibleDraws, fetchVerifiedDraws, HttpFailure, requestJson } from './fetch-draws.ts';

const file = new URL('../src/data/official-draws.json', import.meta.url);
let current = parseSnapshot(JSON.parse(await readFile(file, 'utf8')));
if (current.draws.length !== DRAW_COUNT) throw new Error('本地真实开奖快照不完整');
if (process.env.DRAW_PUBLISHED_URL) {
  try {
    const published = await requestJson(process.env.DRAW_PUBLISHED_URL, { signal: AbortSignal.timeout(60000) });
    const baseline = parseSnapshot(published);
    if (baseline.draws.length !== DRAW_COUNT) throw new Error('已发布的开奖数据不完整，已停止更新');
    const [newer, older] = Number(baseline.draws[0].period) >= Number(current.draws[0].period) ? [baseline, current] : [current, baseline];
    assertCompatibleDraws(newer.draws, older.draws);
    current = selectSnapshot(current, JSON.stringify(baseline));
  } catch (error) {
    // A 404 is expected during the first deployment of this data endpoint.
    if (!(error instanceof HttpFailure && error.status === 404)) throw new Error('无法核验已发布的开奖数据，已停止更新', { cause: error });
  }
}

let snapshot = current;
try {
  const incoming = await fetchVerifiedDraws(current, { signal: AbortSignal.timeout(120000) });
  if (Number(incoming.draws[0].period) < Number(current.draws[0].period)) {
    throw new Error('官方响应早于已保存的开奖');
  }
  snapshot = selectSnapshot(current, JSON.stringify(incoming));
} catch (error) {
  if (!process.argv.includes('--allow-saved')) throw error;
  const reason = String(error instanceof Error ? error.message : error).replace(/[\r\n]/g, ' ');
  console.warn(`::warning::官方更新未成功：${reason}；沿用第 ${current.draws[0].period} 期的已验证真实快照，采集时间为 ${current.fetchedAt}`);
}

await writeFile(file, JSON.stringify(snapshot, null, 2) + '\n');
console.log(`已准备 ${snapshot.draws.length} 期官方开奖，最新第 ${snapshot.draws[0].period} 期（${snapshot.draws[0].date}），采集于 ${snapshot.fetchedAt}`);
