import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {METHODS,generate,prepareContext,rankWeights,weightedSample,wins,measureV3} from './research/backtest-v3-lib.ts';
import {seededRandom,historyBefore} from './research/backtest-lib.ts';
import {generateLottoSets} from '../src/lib/lotto.ts';
import {generateLottoSets as generateV2} from './research/baseline-v2/lotto.ts';
import {parseSnapshot} from '../src/lib/draws.ts';
const snapshot=parseSnapshot(JSON.parse(readFileSync(new URL('../src/data/official-draws.json',import.meta.url),'utf8')));
const context=prepareContext(snapshot.draws);
test('any-prize event matches all18 front/back outcomes and the13 official winning conditions',()=>{
 const matrix=[[false,false,true],[false,false,true],[false,true,true],[true,true,true],[true,true,true],[true,true,true]];
 for(let f=0;f<=5;f++)for(let b=0;b<=2;b++)assert.equal(wins(f,b),matrix[f][b]);
 assert.equal(matrix.flat().filter(Boolean).length,13);
});
test('average ranks remove arbitrary number-order preference when historical values tie',()=>{
 assert.deepEqual(rankWeights([7,7,7]),[1,1,1]);assert.deepEqual(rankWeights([0,1,2]),[.75,1,1.25]);assert.deepEqual(rankWeights([0,0,2]),[.875,.875,1.25]);
 assert.deepEqual(weightedSample(3,[1,1,1],()=>0),[1,2,3]);
});
test('all research methods return five reproducible legal tickets',()=>{
 for(const method of METHODS){const a=generate(method,context,seededRandom(137)),b=generate(method,context,seededRandom(137));assert.deepEqual(a,b);assert.equal(a.length,5);for(const s of a)for(const [zone,count,max] of [[s.front,5,35],[s.back,2,12]] as const){assert.equal(zone.length,count);assert.equal(new Set(zone).size,count);assert.ok(zone.every(n=>Number.isInteger(n)&&n>=1&&n<=max));assert.deepEqual(zone,[...zone].sort((a,b)=>a-b));}}
});
test('disjoint batches cover25 front and10 back numbers even with a constant RNG',()=>{
 for(const r of [()=>0,seededRandom(45)]){const sets=generate('disjoint',context,r);assert.equal(new Set(sets.flatMap(s=>s.front)).size,25);assert.equal(new Set(sets.flatMap(s=>s.back)).size,10);}
 const sets=generate('uniqueBackPairs',context,()=>0);assert.equal(new Set(sets.map(s=>s.back.join(','))).size,5);
});
test('currentV2 research arm uses the frozen V2 selection while random matches production',()=>{
 assert.deepEqual(generate('currentV2',context,seededRandom(315)),generateV2(5,true,context.hot,seededRandom(315)).map(({front,back})=>({front,back})));
 assert.deepEqual(generate('random',context,seededRandom(315)),generateLottoSets(5,false,context.hot,seededRandom(315)).map(({front,back})=>({front,back})));
});
test('joint hits distinguish batch any-prize from ticket any-prize and duplicate pairs',()=>{
 const draw={period:'26123',date:'2026-10-28',front:[1,2,3,4,5],back:[1,2]};
 const sets=[{front:[1,2,6,7,8],back:[1,9]},{front:[10,11,12,13,14],back:[1,2]},{front:[15,16,17,18,19],back:[1,9]}];
 const m=measureV3(sets,draw);assert.equal(m.values[0],2/3);assert.equal(m.values[1],1);assert.equal(m.values[10],0);assert.equal(m.values[11],1);assert.equal(m.joint[2*3+1],1);assert.equal(m.joint[2],1);assert.equal(m.joint[1],1);
});
test('target and future changes do not alter the prior50 context',()=>{
 const ascending=[...snapshot.draws].reverse();ascending.push({...ascending.at(-1)!,period:'26124',date:'2026-10-31'});
 const before=prepareContext(historyBefore(ascending,50));ascending[50]={...ascending[50],front:[1,2,3,4,5]};assert.deepEqual(prepareContext(historyBefore(ascending,50)),before);
 assert.throws(()=>prepareContext(ascending));
});

test('frozen V2 research arms reproduce all archived fixed number batches', () => {
 const history = JSON.parse(readFileSync(new URL('../reports/backtest-2026-11-11/data/history.json', import.meta.url), 'utf8')).draws;
 const archived = JSON.parse(readFileSync(new URL('../reports/backtest-2026-11-11/theory-batches.json', import.meta.url), 'utf8')).batches;
 const contexts = new Map<string, ReturnType<typeof prepareContext>>();
 let checked = 0;
 for (const row of archived) {
  if (row.method !== 'currentV2' && row.method !== 'v2NoHistory') continue;
  if (!contexts.has(row.targetPeriod)) {
   const index = history.findIndex((draw: {period: string}) => draw.period === row.targetPeriod);
   assert.ok(index >= 50);
   contexts.set(row.targetPeriod, prepareContext(historyBefore(history, index)));
  }
  assert.deepEqual(generate(row.method, contexts.get(row.targetPeriod)!, seededRandom(row.seed)), row.tickets);
  checked++;
 }
 assert.equal(checked, 200);
});
