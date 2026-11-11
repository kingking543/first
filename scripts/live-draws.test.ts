import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {refreshOfficialSnapshot, officialDrawResponse} from '../server/official-draws.ts';
import {parseSnapshot, OFFICIAL_HISTORY_URL} from '../src/lib/draws.ts';
import {FUJIAN_HISTORY_URL} from './fetch-draws.ts';
const base=parseSnapshot(JSON.parse(readFileSync(new URL('../src/data/official-draws.json',import.meta.url),'utf8')));
const newer={...structuredClone(base),draws:[{...structuredClone(base.draws[0]),period:String(Number(base.draws[0].period)+1),date:new Date(Date.parse(base.draws[0].date)+2*86400000).toISOString().slice(0,10)},...base.draws.slice(0,49)]};
const rows=(snapshot:typeof base)=>snapshot.draws.map(d=>({verify:'1',lotteryGameNum:'85',lotteryDrawNum:d.period,lotteryDrawTime:d.date,lotteryDrawResult:[...d.front,...d.back].join(' ')}));
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status});
const stub=(central:typeof base|null,fujian:typeof base|null,published=base):typeof fetch=>async url=>{
 const u=String(url);
 if(u===OFFICIAL_HISTORY_URL)return central?reply({success:true,errorCode:'0',value:{list:rows(central)}}):reply({},567);
 if(u===FUJIAN_HISTORY_URL)return fujian?reply({code:0,data:rows(fujian)}):reply({},403);
 return reply(published);
};

test('healthy but older central data cannot hide newer approved Fujian results',async()=>{
 const result=await refreshOfficialSnapshot(base,{fetcher:stub(base,newer)});
 assert.equal(result.verification,'official');assert.equal(result.snapshot.draws[0].period,newer.draws[0].period);
 assert.equal(result.snapshot.source,'fujian-sporttery');
 assert.ok(Date.parse(result.snapshot.fetchedAt)>Date.parse(base.fetchedAt));
});
test('blocked central source still permits official verification through Fujian',async()=>{
 const result=await refreshOfficialSnapshot(base,{fetcher:stub(null,newer)});
 assert.equal(result.verification,'official');assert.equal(result.snapshot.source,'fujian-sporttery');
});
test('all official sources down retains the newest published backup time',async()=>{
 const published={...newer,fetchedAt:new Date(Date.parse(base.fetchedAt)+60000).toISOString()};
 const result=await refreshOfficialSnapshot(base,{fetcher:stub(null,null,published)});
 assert.equal(result.verification,'snapshot');assert.deepEqual(result.snapshot,published);
});
test('disagreeing new official numbers do not get published as verified',async()=>{
 const conflict=structuredClone(newer);conflict.draws[0].front=[1,2,3,4,5];
 if(String(conflict.draws[0].front)===String(newer.draws[0].front))conflict.draws[0].front=[2,3,4,5,6];
 const result=await refreshOfficialSnapshot(base,{fetcher:stub(newer,conflict)});
 assert.equal(result.verification,'snapshot');assert.deepEqual(result.snapshot,base);
});
test('invalid published backup and failed officials preserve the bundled verification time',async()=>{
 const result=await refreshOfficialSnapshot(base,{fetcher:async()=>reply({bad:true})});
 assert.equal(result.verification,'snapshot');assert.deepEqual(result.snapshot,base);
});
test('cancelled request does not start upstream work',async()=>{
 const c=new AbortController();c.abort();let calls=0;
 await assert.rejects(refreshOfficialSnapshot(base,{signal:c.signal,fetcher:async()=>{calls++;return reply(base);}}));
 assert.equal(calls,0);
});
test('public endpoint returns flat compatible JSON, explicit verification and no-store CORS',async()=>{
 const response=await officialDrawResponse(new Request('https://example.test/api/official-draws'),base,{fetcher:stub(null,newer)});
 assert.equal(response.status,200);assert.equal(response.headers.get('access-control-allow-origin'),'*');
 assert.equal(response.headers.get('cache-control'),'no-store');
 const body=await response.json();assert.equal(body.verification,'official');assert.equal(body.draws[0].period,newer.draws[0].period);
 assert.equal(parseSnapshot(body).draws.length,50);
});
test('preflight and invalid methods make no official requests',async()=>{
 let calls=0;const fetcher:typeof fetch=async()=>{calls++;return reply(base);};
 for(const [method,status] of [['OPTIONS',204],['POST',405]] as const){
  const response=await officialDrawResponse(new Request('https://example.test/api/official-draws',{method}),base,{fetcher});
  assert.equal(response.status,status);
 }
 assert.equal(calls,0);
});


test('one hanging official source is bounded without discarding the other completed result', async () => {
 const started=Date.now();let officialCalls=0;
 const result=await refreshOfficialSnapshot(base,{budgetMs:40,fetcher:async(url,init)=>{
  if(String(url)===OFFICIAL_HISTORY_URL){
   officialCalls++;
   return await new Promise<Response>((_resolve,reject)=>init?.signal?.addEventListener('abort',()=>reject(init.signal?.reason),{once:true}));
  }
  if(String(url)===FUJIAN_HISTORY_URL){officialCalls++;return reply({code:0,data:rows(newer)});}
  return reply(base);
 }});
 assert.equal(officialCalls,2);assert.equal(result.verification,'official');
 assert.equal(result.snapshot.draws[0].period,newer.draws[0].period);
 assert.ok(Date.now()-started<1000);
});
test('HTTP snapshot fallback explicitly preserves original verification time',async()=>{
 const response=await officialDrawResponse(new Request('https://example.test/api/official-draws'),base,{fetcher:stub(null,null)});
 const payload=await response.json();assert.equal(payload.verification,'snapshot');assert.equal(payload.fetchedAt,base.fetchedAt);
});
