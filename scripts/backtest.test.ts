import assert from 'node:assert/strict';
import test from 'node:test';
import { historyBefore, measure, seededRandom, shapeOnly, trialSeed } from './research/backtest-lib.ts';

test('walk-forward history excludes target and all future draws, newest first', () => {
  const draws = Array.from({length:60},(_,i)=>({period:String(26001+i),date:'2026-01-01',front:[1,2,3,4,5],back:[1,2]}));
  assert.equal(historyBefore(draws,50)[0].period,'26050');
  assert.equal(historyBefore(draws,50).at(-1)?.period,'26001');
  const before=historyBefore(draws,55);draws[55]={...draws[55],front:[6,7,8,9,10]};draws[59]={...draws[59],back:[3,4]};
  assert.deepEqual(historyBefore(draws,55),before);
  assert.throws(()=>historyBefore(draws,49));
});
test('batch metrics use ticket and batch denominators correctly',()=>{
  const sets=[{front:[1,2,3,4,5],back:[1,2]},{front:[1,2,6,7,8],back:[3,4]}];
  const m=measure(sets,{period:'26001',date:'2026-01-01',front:[1,2,3,4,5],back:[1,2]},new Set());
  assert.deepEqual(m.values.slice(0,8),[3.5,1,1,1,.5,8,4,0]);
  assert.deepEqual(m.frontHistogram,[0,0,1,0,0,1]);assert.deepEqual(m.backHistogram,[1,0,1]);
  assert.equal(measure([sets[0],sets[0]],{period:'26001',date:'2026-01-01',...sets[0]},new Set()).values[7],1);
});
test('seeded trials are reproducible and shape ablation preserves legal sampling',()=>{
  const a=seededRandom(trialSeed(2,'26123')),b=seededRandom(trialSeed(2,'26123'));
  assert.deepEqual(Array.from({length:100},a),Array.from({length:100},b));
  assert.notEqual(trialSeed(1,'26123'),trialSeed(2,'26123'));
  for(const s of shapeOnly(5,seededRandom(42))){assert.equal(new Set(s.front).size,5);assert.equal(new Set(s.back).size,2);assert.ok(s.front[0]>=1&&s.front[4]<=35&&s.back[0]>=1&&s.back[1]<=12);}
});
