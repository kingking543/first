import { readFile, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { calculateDrawStats, parseOfficialHistory, parseSnapshot } from '../../src/lib/draws.ts';
import { buildHotNumbers, generateLottoSets } from './baseline-lotto.ts';
import { METRICS, historyBefore, measure, seededRandom, shapeOnly, trialSeed } from './backtest-lib.ts';

const root = new URL('../../', import.meta.url);
const folder = new URL('reports/backtest-2026-10-28/', root);
const sha = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
const manifest = JSON.parse(await readFile(new URL('data/manifest.json', folder), 'utf8'));
const all = [];
for (const page of manifest.pages) {
  const raw = gunzipSync(await readFile(new URL(`data/page-${String(page.page).padStart(2,'0')}.json.gz`, folder)));
  if (sha(raw) !== page.sha256) throw new Error('Raw source checksum mismatch');
  all.push(...parseOfficialHistory(JSON.parse(raw.toString())));
}
const normalized = parseSnapshot({ fetchedAt: new Date().toISOString(), draws: all }).draws;
for (let i = 1; i < normalized.length; i++) {
  const a=normalized[i-1].period,b=normalized[i].period;
  if (a.slice(0,2)===b.slice(0,2) ? Number(a)-Number(b)!==1 : Number(a.slice(0,2))-Number(b.slice(0,2))!==1||a.slice(2)!=='001') throw new Error('Historical period gap');
}
const local = parseSnapshot(JSON.parse(await readFile(new URL('src/data/official-draws.json',root),'utf8')));
for (const saved of local.draws) {
  const found=normalized.find(d=>d.period===saved.period);
  if (JSON.stringify(found)!==JSON.stringify(saved)) throw new Error('Mismatch with saved provincial official snapshot '+saved.period);
}
const ascending=normalized.slice(0,1050).reverse();
if(ascending.length!==1050)throw new Error('Need1050 records');
const normalizedText=JSON.stringify({source:'中国体彩网公开历史接口',fetchedAt:new Date().toISOString(),draws:ascending},null,2)+'\n';
await writeFile(new URL('data/history.json',folder),normalizedText);
const targets=ascending.slice(50);
const hot=targets.map((_d,i)=>buildHotNumbers(calculateDrawStats(historyBefore(ascending,i+50)).frontData));
const methods=['random','current','shapeOnly'];
const repetitions=200;
const perDraw=targets.map(d=>({period:d.period,date:d.date,sums:methods.map(()=>METRICS.map(()=>0))}));
const histogram=methods.map(()=>({front:Array<number>(6).fill(0),back:Array<number>(3).fill(0),lateFront:Array<number>(6).fill(0),lateBack:Array<number>(3).fill(0)}));
const trials:number[][][]=[];
const start=performance.now();
for(let trial=0;trial<repetitions;trial++){
  const totals=methods.map(()=>METRICS.map(()=>0));
  for(let i=0;i<targets.length;i++){
    const seed=trialSeed(trial,targets[i].period);
    const batches=[generateLottoSets(5,false,hot[i],seededRandom(seed)),generateLottoSets(5,true,hot[i],seededRandom(seed)),shapeOnly(5,seededRandom(seed))];
    for(let m=0;m<methods.length;m++){
      const result=measure(batches[m],targets[i],hot[i]);
      result.values.forEach((value,k)=>{perDraw[i].sums[m][k]+=value;totals[m][k]+=value;});
      result.frontHistogram.forEach((v,k)=>{histogram[m].front[k]+=v;if(i>=700)histogram[m].lateFront[k]+=v;});
      result.backHistogram.forEach((v,k)=>{histogram[m].back[k]+=v;if(i>=700)histogram[m].lateBack[k]+=v;});
    }
  }
  trials.push(totals.map(values=>values.map(v=>v/targets.length)));
  if((trial+1)%10===0)console.log(`已完成 ${trial+1}/${repetitions} 轮，${Math.round((performance.now()-start)/1000)}秒`);
}
const result={
  protocol:'protocol.md',generatedAt:new Date().toISOString(),gitCommit:'d8a11082951522b1231ff86a5dbc0b0788e5f2ec',runGitCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  productionCodeSha256:sha(await readFile(new URL('scripts/research/baseline-lotto.ts',root))),historySha256:sha(normalizedText),
  audit:{downloaded:normalized.length,used:ascending.length,matchedLocalOfficial:local.draws.length,earliest:ascending[0],latest:ascending.at(-1)},
  repetitions,perPeriodTickets:5,methods,metrics:METRICS,
  perDraw:perDraw.map(d=>({...d,sums:undefined,means:d.sums.map(values=>values.map(v=>v/repetitions))})),histogram,trials,
  elapsedSeconds:(performance.now()-start)/1000,
};
await writeFile(new URL('results.json',folder),JSON.stringify(result,null,2)+'\n');
console.log('研究结果已保存；前端及生产生成器未修改。');
