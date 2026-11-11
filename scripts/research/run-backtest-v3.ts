import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {METHODS,METRICS,generate,measureV3,prepareContext} from './backtest-v3-lib.ts';
import {historyBefore,seededRandom} from './backtest-lib.ts';
import type {WinningDraw} from '../../src/lib/draws.ts';
const root=new URL('../../',import.meta.url),out=new URL('reports/backtest-2026-11-11/',root);
const arg=(name:string,other:number)=>{const i=process.argv.indexOf(name);return i<0?other:Number(process.argv[i+1]);};
const offset=arg('--offset',0),stride=arg('--stride',1);if(!Number.isInteger(offset)||!Number.isInteger(stride)||offset<0||offset>=stride)throw new Error('Invalid worker args');
const text=await readFile(new URL('data/history.json',out),'utf8'),manifest=JSON.parse(await readFile(new URL('data/manifest.json',out),'utf8'));
if(createHash('sha256').update(text).digest('hex')!==manifest.historySha256)throw new Error('History checksum mismatch');
const draws:WinningDraw[]=JSON.parse(text).draws,targets=draws.slice(50);if(targets.length!==1005)throw new Error('Protocol expects1005 targets');
const context=targets.map((_d,i)=>prepareContext(historyBefore(draws,i+50)));
const perDraw=targets.map(d=>({period:d.period,date:d.date,repetitions:0,sums:METHODS.map(()=>Array<number>(METRICS.length).fill(0))}));
const joints=Object.fromEntries(['old','late','forward'].map(s=>[s,METHODS.map(()=>Array<number>(18).fill(0))])) as Record<string,number[][]>;
const trials:{trial:number;old?:number[][];late?:number[][];forward:number[][]}[]=[];
const start=performance.now();let completed=0;
for(let trial=offset;trial<1000;trial+=stride){
 const total={old:METHODS.map(()=>Array<number>(METRICS.length).fill(0)),late:METHODS.map(()=>Array<number>(METRICS.length).fill(0)),forward:METHODS.map(()=>Array<number>(METRICS.length).fill(0))};
 for(let i=trial<50?0:1000;i<targets.length;i++){
  perDraw[i].repetitions++;
  const seed=(Math.imul(trial+1,0x9e3779b1)^Math.imul(Number(targets[i].period),0x85ebca6b)^20261111)>>>0;
  METHODS.forEach((method,m)=>{
   const result=measureV3(generate(method,context[i],seededRandom(seed)),targets[i]);
   const groups=i<1000?(i>=700?['old','late']:['old']):['forward'];
   result.values.forEach((v,k)=>{perDraw[i].sums[m][k]+=v;groups.forEach(g=>total[g as keyof typeof total][m][k]+=v);});
   result.joint.forEach((v,k)=>groups.forEach(g=>joints[g][m][k]+=v));
  });
 }
 trials.push({trial,...(trial<50?{old:total.old.map(a=>a.map(v=>v/1000)),late:total.late.map(a=>a.map(v=>v/300))}:{}),forward:total.forward.map(a=>a.map(v=>v/5))});
 completed++;if(trial<50||completed%25===0)console.log(`worker${offset}: trial${trial}, ${Math.round((performance.now()-start)/1000)}s`);
}
await writeFile(new URL(`worker-${offset}.json`,out),JSON.stringify({offset,stride,methods:METHODS,metrics:METRICS,perDraw,joints,trials,elapsedSeconds:(performance.now()-start)/1000})+'\n');
console.log(`worker${offset} complete`);
