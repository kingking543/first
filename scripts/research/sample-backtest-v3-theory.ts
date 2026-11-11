import {readFile,writeFile} from 'node:fs/promises';
import type {WinningDraw} from '../../src/lib/draws.ts';
import {METHODS,prepareContext,generate} from './backtest-v3-lib.ts';
import {historyBefore,seededRandom} from './backtest-lib.ts';
const root=new URL('../../',import.meta.url),out=new URL('reports/backtest-2026-11-11/',root);
const draws:WinningDraw[]=JSON.parse(await readFile(new URL('data/history.json',out),'utf8')).draws;
const batches=[];
for(let c=0;c<20;c++){
 const index=50+Math.round(c*999/19),context=prepareContext(historyBefore(draws,index));
 for(let trial=0;trial<5;trial++){
  const seed=(Math.imul(trial+100001,0x9e3779b1)^Math.imul(Number(draws[index].period),0x85ebca6b)^20261111)>>>0;
  for(const method of METHODS)batches.push({context:c,targetPeriod:draws[index].period,historyLastPeriod:draws[index-1].period,trial,seed,method,tickets:generate(method,context,seededRandom(seed))});
 }
}
await writeFile(new URL('theory-batches.json',out),JSON.stringify({note:'These batches use only each context’s previous50 draws; exact outcomes below are hypothetical fair-draw outcomes, not historical target results.',batches},null,2)+'\n');
console.log('Saved800 fixed batches for exact structural evaluation');
