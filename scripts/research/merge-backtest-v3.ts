import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {METHODS,METRICS,wins} from './backtest-v3-lib.ts';
const root=new URL('../../',import.meta.url),out=new URL('reports/backtest-2026-11-11/',root);
const workers=await Promise.all(Array.from({length:4},(_,i)=>readFile(new URL(`worker-${i}.json`,out),'utf8').then(JSON.parse)));
const perDraw=workers[0].perDraw.map((row:{period:string;date:string},i:number)=>{
 const repetitions=workers.reduce((a,w)=>a+w.perDraw[i].repetitions,0);assert.equal(repetitions,i<1000?50:1000);
 const means=METHODS.map((_m,m)=>METRICS.map((_k,k)=>workers.reduce((a,w)=>a+w.perDraw[i].sums[m][k],0)/repetitions));
 for(const w of workers)assert.equal(w.perDraw[i].period,row.period);
 return {period:row.period,date:row.date,repetitions,means};
});
const joints=Object.fromEntries(['old','late','forward'].map(s=>[s,METHODS.map((_m,m)=>Array.from({length:18},(_v,k)=>workers.reduce((a,w)=>a+w.joints[s][m][k],0)))]));
for(const [label,start,end,reps] of [['old',0,1000,50],['late',700,1000,50],['forward',1000,1005,1000]] as const){
 for(let m=0;m<METHODS.length;m++){
  const cells=joints[label][m];assert.equal(cells.reduce((a:number,b:number)=>a+b,0),(end-start)*reps*5);
  const prize=cells.reduce((a:number,v:number,k:number)=>a+(wins(Math.floor(k/3),k%3)?v:0),0)/((end-start)*reps*5);
  const periodMean=perDraw.slice(start,end).reduce((a:number,d:{means:number[][]})=>a+d.means[m][0],0)/(end-start);
  assert.ok(Math.abs(prize-periodMean)<1e-12);
 }
}
const sourcePaths=['scripts/research/baseline-v2/lotto.ts','scripts/research/baseline-v2/quantified.ts','scripts/research/baseline-v2/number-sampling.ts','src/lib/draws.ts','scripts/research/backtest-lib.ts','scripts/research/baseline-lotto.ts','scripts/research/backtest-v3-lib.ts','scripts/research/run-backtest-v3.ts','reports/backtest-2026-11-11/protocol.md','reports/backtest-2026-11-11/data/history.json'];
const hashes=Object.fromEntries(await Promise.all(sourcePaths.map(async p=>[p,createHash('sha256').update(await readFile(new URL(p,root))).digest('hex')])));
const trials=workers.flatMap(w=>w.trials).sort((a,b)=>a.trial-b.trial);assert.equal(new Set(trials.map(t=>t.trial)).size,1000);assert.equal(trials.filter(t=>t.old).length,50);
const manifest=JSON.parse(await readFile(new URL('data/manifest.json',out),'utf8'));
const result={generatedAt:new Date().toISOString(),gitCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),methods:METHODS,metrics:METRICS,audit:manifest,sourceHashes:hashes,parameters:{historyWindow:50,ticketsPerPeriod:5,retrospectivePeriods:1000,retrospectiveRepetitions:50,forwardPeriods:5,forwardRepetitions:1000,seedSalt:20261111,seedFormula:'(imul(trial+1,0x9e3779b1)^imul(Number(period),0x85ebca6b)^20261111)>>>0',periodWeighting:'equal within each reported segment; never pool raw ticket counts across segments',totalTicketsPerMethod:275000},perDraw,joints,trials,parallelWallSeconds:Math.max(...workers.map(w=>w.elapsedSeconds)),sumWorkerSeconds:workers.reduce((a,w)=>a+w.elapsedSeconds,0)};
await writeFile(new URL('results.json',out),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({targets:perDraw.length,ticketsPerMethod:result.parameters.totalTicketsPerMethod,wallSeconds:result.parallelWallSeconds,oldMean:METHODS.map((method,m)=>({method,anyPrizeTicket:perDraw.slice(0,1000).reduce((a:number,d:{means:number[][]})=>a+d.means[m][0],0)/1000,anyPrizeBatch:perDraw.slice(0,1000).reduce((a:number,d:{means:number[][]})=>a+d.means[m][1],0)/1000}))}));
