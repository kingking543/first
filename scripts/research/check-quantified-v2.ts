import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { generateLottoSets as updated } from '../../src/lib/lotto.ts';
import { buildHotNumbers, generateLottoSets as baseline } from './baseline-lotto.ts';
import { calculateDrawStats } from '../../src/lib/draws.ts';
import type { WinningDraw } from '../../src/lib/draws.ts';
import { historyBefore, measure, METRICS, seededRandom, trialSeed } from './backtest-lib.ts';
const root=new URL('../../',import.meta.url);
const draws:WinningDraw[]=JSON.parse(await readFile(new URL('reports/backtest-2026-10-28/data/history.json',root),'utf8')).draws;
const names=['random','legacyQuantified','quantifiedV2'];const reps=30;const count=300;
const totals=names.map(()=>Array<number>(8).fill(0));const scores=names.map(()=>new Map<number,number>());const hotCounts=names.map(()=>Array<number>(6).fill(0));
for(let trial=0;trial<reps;trial++){
 for(let index=draws.length-count;index<draws.length;index++){
  const hot=buildHotNumbers(calculateDrawStats(historyBefore(draws,index)).frontData);const seed=trialSeed(trial,draws[index].period);
  const batches=[baseline(5,false,hot,seededRandom(seed)),baseline(5,true,hot,seededRandom(seed)),updated(5,true,hot,seededRandom(seed))];
  batches.forEach((sets,m)=>{
   const values=measure(sets,draws[index],hot).values;
   for(let k=0;k<8;k++)totals[m][k]+=values[k];
   sets.forEach(set=>{scores[m].set(set.score!,1+(scores[m].get(set.score!)??0));hotCounts[m][set.front.filter(n=>hot.has(n)).length]++;});
  });
 }
 if((trial+1)%5===0)console.log(`工程检查 ${trial+1}/${reps}轮`);
}
const result={generatedAt:new Date().toISOString(),note:'已检查过的历史数据上的工程回归，不是新的样本外或预测优势验证',targets:count,repetitions:reps,ticketsPerMethod:count*reps*5,first:draws.at(-count)!.period,last:draws.at(-1)!.period,
 metrics:METRICS.slice(0,8),methods:names.map((name,i)=>({name,mean:totals[i].map(n=>n/(count*reps)),scores:Object.fromEntries([...scores[i]].sort((a,b)=>a[0]-b[0])),hotCounts:hotCounts[i]})),
 productionCodeSha256:createHash('sha256').update(await readFile(new URL('src/lib/lotto.ts',root))).digest('hex'),
 quantifiedCodeSha256:createHash('sha256').update(await readFile(new URL('src/lib/quantified.ts',root))).digest('hex')};
await writeFile(new URL('reports/backtest-2026-10-28/quantified-v2-engineering-check.json',root),JSON.stringify(result,null,2)+'\n');
console.log(result.methods.map(m=>({name:m.name,frontCoverage:m.mean[5],backCoverage:m.mean[6],distinctScores:Object.keys(m.scores).length,hotCounts:m.hotCounts})));
