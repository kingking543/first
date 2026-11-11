import { generateLottoSets, buildHotNumbers } from './baseline-v2/lotto.ts';
import { selectQuantified } from './baseline-v2/quantified.ts';
import { sampleNumbers, unitRandom } from './baseline-v2/number-sampling.ts';
import { calculateDrawStats } from '../../src/lib/draws.ts';
import type { WinningDraw } from '../../src/lib/draws.ts';
export type Ticket = Pick<WinningDraw, 'front' | 'back'>;
export const METHODS = ['random','currentV2','v2NoHistory','disjoint','uniqueBackPairs','hot50','cold50','overdue50'] as const;
export const METRICS = ['anyPrizeTicket','anyPrizeBatch','frontMean','backMean','front3Ticket','back2Ticket','anyFront3','anyBack2','frontCoverage','backCoverage','duplicateTickets','duplicateBackPairs','firstPrizeTicket'] as const;
export function wins(front: number, back: number) { return front >= 3 || (front >= 2 && back >= 1) || back === 2; }
export function rankWeights(values: number[]) {
  if (values.length < 2) return values.map(() => 1);
  return values.map(value => {
    const below = values.filter(x => x < value).length;
    const ties = values.filter(x => x === value).length;
    return 0.75 + 0.5 * (below + (ties - 1) / 2) / (values.length - 1);
  });
}
export function prepareContext(past: WinningDraw[]) {
  if (past.length !== 50) throw new Error('Require exactly50 previous draws');
  const stats=calculateDrawStats(past);
  return {hot:buildHotNumbers(stats.frontData),hotFront:rankWeights(stats.frontData.map(d=>d.freq)),hotBack:rankWeights(stats.backData.map(d=>d.freq)),overFront:rankWeights(stats.frontData.map(d=>d.overdue)),overBack:rankWeights(stats.backData.map(d=>d.overdue))};
}
function orderedSample(count:number, maximum:number, random:()=>number) {
  const pool=Array.from({length:maximum},(_,i)=>i+1);
  for(let i=0;i<count;i++){const j=i+Math.floor(unitRandom(random)*(maximum-i));[pool[i],pool[j]]=[pool[j],pool[i]];}
  return pool.slice(0,count);
}
export function weightedSample(count:number, weights:number[], random:()=>number) {
  const pool=weights.map((weight,i)=>({weight,number:i+1}));const result:number[]=[];
  if(weights.some(w=>!Number.isFinite(w)||w<=0)||count>pool.length)throw new Error('Invalid weights/count');
  for(let k=0;k<count;k++){
    let target=unitRandom(random)*pool.reduce((a,b)=>a+b.weight,0),chosen=pool.length-1;
    for(let i=0;i<pool.length;i++){target-=pool[i].weight;if(target<0){chosen=i;break;}}
    result.push(pool.splice(chosen,1)[0].number);
  }
  return result.sort((a,b)=>a-b);
}
export function generate(method: typeof METHODS[number], context:ReturnType<typeof prepareContext>, random:()=>number):Ticket[] {
  if(method==='random'||method==='currentV2') return generateLottoSets(5,method==='currentV2',context.hot,random).map(({front,back})=>({front,back}));
  if(method==='v2NoHistory')return selectQuantified(5,new Set(),random);
  if(method==='disjoint'){
    const front=orderedSample(25,35,random),back=orderedSample(10,12,random);
    return Array.from({length:5},(_,i)=>({front:front.slice(i*5,i*5+5).sort((a,b)=>a-b),back:back.slice(i*2,i*2+2).sort((a,b)=>a-b)}));
  }
  if(method==='uniqueBackPairs'){
    const pairs=new Set<string>();const sets:Ticket[]=[];
    for(let i=0;i<5;i++){
      const front=sampleNumbers(5,35,random);let back:number[]|undefined;
      for(let j=0;j<100;j++){const b=sampleNumbers(2,12,random);if(!pairs.has(b.join(','))){back=b;break;}}
      // Only for a degenerate externally supplied RNG; seeded runs do not reach it.
      if(!back){outer:for(let a=1;a<=12;a++)for(let b=a+1;b<=12;b++)if(!pairs.has(`${a},${b}`)){back=[a,b];break outer;}}
      if(!back)throw new Error('No unused pair');pairs.add(back.join(','));sets.push({front,back});
    }
    return sets;
  }
  const front=method==='overdue50'?context.overFront:method==='cold50'?context.hotFront.map(w=>2-w):context.hotFront;
  const back=method==='overdue50'?context.overBack:method==='cold50'?context.hotBack.map(w=>2-w):context.hotBack;
  return Array.from({length:5},()=>({front:weightedSample(5,front,random),back:weightedSample(2,back,random)}));
}
export function measureV3(sets:Ticket[], draw:WinningDraw) {
  const f=sets.map(s=>s.front.filter(n=>draw.front.includes(n)).length),b=sets.map(s=>s.back.filter(n=>draw.back.includes(n)).length);
  const joint=Array<number>(18).fill(0);f.forEach((n,i)=>joint[n*3+b[i]]++);
  const count=(predicate:(i:number)=>boolean)=>f.filter((_n,i)=>predicate(i)).length/sets.length;
  return {values:[count(i=>wins(f[i],b[i])),Number(f.some((n,i)=>wins(n,b[i]))),f.reduce((a,b)=>a+b,0)/sets.length,b.reduce((a,b)=>a+b,0)/sets.length,count(i=>f[i]>=3),count(i=>b[i]===2),Number(f.some(n=>n>=3)),Number(b.some(n=>n===2)),new Set(sets.flatMap(s=>s.front)).size,new Set(sets.flatMap(s=>s.back)).size,sets.length-new Set(sets.map(s=>s.front.join(',')+'|'+s.back.join(','))).size,sets.length-new Set(sets.map(s=>s.back.join(','))).size,count(i=>f[i]===5&&b[i]===2)],joint};
}
