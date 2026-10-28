import { readFile, writeFile } from 'node:fs/promises';
import { DRAW_COUNT, fetchOfficialSnapshot, parseSnapshot, selectSnapshot } from '../src/lib/draws.ts';

const file = new URL('../src/data/official-draws.json', import.meta.url);
let current = parseSnapshot(JSON.parse(await readFile(file, 'utf8')));
if (process.env.DRAW_PUBLISHED_URL) {
  const published = await fetch(process.env.DRAW_PUBLISHED_URL, { signal: AbortSignal.timeout(15000), cache: 'no-store' });
  // A 404 is expected during the first deployment of this data endpoint.
  if (published.status !== 404) {
    if (!published.ok) throw new Error('无法核验已发布的开奖数据，已停止更新');
    const baseline = parseSnapshot(await published.json());
    if (baseline.draws.length !== DRAW_COUNT) throw new Error('已发布的开奖数据不完整，已停止更新');
    current = selectSnapshot(current, JSON.stringify(baseline));
  }
}
const incoming = await fetchOfficialSnapshot(AbortSignal.timeout(15000));
const snapshot = selectSnapshot(current, JSON.stringify(incoming));
if (Number(incoming.draws[0].period) < Number(current.draws[0].period)) {
  throw new Error('官方响应早于已保存的开奖，已保留现有数据，请稍后重试');
}
await writeFile(file, JSON.stringify(snapshot, null, 2) + '\n');
console.log(`已更新 ${snapshot.draws.length} 期官方开奖，最新第 ${snapshot.draws[0].period} 期（${snapshot.draws[0].date}）`);
