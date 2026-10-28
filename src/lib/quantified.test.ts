import assert from 'node:assert/strict';
import test from 'node:test';
import { generateLottoSets } from './lotto.ts';
import { seededRandom } from '../../scripts/research/backtest-lib.ts';
import { generateLottoSets as legacy } from '../../scripts/research/baseline-lotto.ts';
const hot=new Set([1,2,3,4,5,6,7,8,9,10]);
const coverage=(sets:{front:number[];back:number[]}[],zone:'front'|'back')=>new Set(sets.flatMap(s=>s[zone])).size;

test('smart selection softens hot counts, varies scores and improves five-ticket coverage',()=>{
 let front=0,back=0,oldFront=0,randomFront=0,randomBack=0;const scores=new Set<number|undefined>();const hotCounts=new Set<number>();
 for(let seed=1;seed<=100;seed++){
  const sets=generateLottoSets(5,true,hot,seededRandom(seed));
  const old=legacy(5,true,hot,seededRandom(seed));const random=generateLottoSets(5,false,hot,seededRandom(seed));
  front+=coverage(sets,'front');back+=coverage(sets,'back');oldFront+=coverage(old,'front');randomFront+=coverage(random,'front');randomBack+=coverage(random,'back');
  assert.equal(new Set(sets.map(s=>s.front.join(',')+'|'+s.back.join(','))).size,5);
  for(const s of sets){scores.add(s.score);hotCounts.add(s.front.filter(n=>hot.has(n)).length);}
 }
 assert.ok(front>oldFront+150);assert.ok(front>randomFront+150);assert.ok(back>randomBack+50);
 assert.ok(scores.size>10);assert.ok(hotCounts.has(0)&&hotCounts.has(1)&&hotCounts.has(4));
});
test('constant random input terminates with50 unique valid smart tickets',()=>{
 let calls=0;const sets=generateLottoSets(50,true,hot,()=>{calls++;return 0;});
 assert.equal(new Set(sets.map(s=>s.front.join(',')+'|'+s.back.join(','))).size,50);assert.ok(calls<30000);
 assert.ok(sets.every(s=>s.score!>=0&&s.score!<=100&&s.front[0]>=1&&s.front[4]<=35&&s.back[0]>=1&&s.back[1]<=12));
});
test('random mode retains independent uniform sampling without batch rejection',()=>{
 let calls=0;const sets=generateLottoSets(5,false,hot,()=>{calls++;return 0;});assert.equal(calls,35);
 assert.ok(sets.every(s=>String(s.front)==='1,2,3,4,5'&&String(s.back)==='1,2'));
});


test('invalid random values fail explicitly in either mode',()=>{
 for(const smart of [true,false])for(const value of [-1,1,NaN,Infinity])assert.throws(()=>generateLottoSets(1,smart,hot,()=>value));
});


test('pure random number sequences match the frozen original for identical seeds',()=>{
 for(let seed=1;seed<=30;seed++){
  const expected=legacy(5,false,hot,seededRandom(seed)).map(s=>({front:s.front,back:s.back}));
  assert.deepEqual(generateLottoSets(5,false,hot,seededRandom(seed)).map(s=>({front:s.front,back:s.back})),expected);
 }
});
