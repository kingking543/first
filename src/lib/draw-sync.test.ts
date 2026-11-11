import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { publishedSnapshotUrl, syncPublishedSnapshot } from './draw-sync.ts';
import { parseSnapshot } from './draws.ts';
const current=parseSnapshot(JSON.parse(readFileSync(new URL('../data/official-draws.json',import.meta.url),'utf8')));

test('loopback dev and preview use the live production endpoint',()=>{
 for(const host of ['localhost','127.0.0.1','[::1]','0.0.0.0','demo.localhost']){
  const url=new URL(publishedSnapshotUrl(`http://${host}:4318/first/`,123));
  assert.equal(url.origin,'https://first-wine-iota.vercel.app');assert.equal(url.pathname,'/data/official-draws.json');assert.equal(url.searchParams.get('_sync'),'123');
 }
});
test('deployed sites keep their own base path and version every explicit check',()=>{
 const url=new URL(publishedSnapshotUrl('https://example.test/custom/?x=1',456));
 assert.equal(url.origin,'https://example.test');assert.equal(url.pathname,'/custom/data/official-draws.json');
 assert.notEqual(url.href,publishedSnapshotUrl('https://example.test/custom/',457));
});
test('online upgrade is validated and retains official verification time without mutating fallback',async()=>{
 const incoming=structuredClone(current);incoming.fetchedAt=new Date(Date.parse(current.fetchedAt)+60000).toISOString();
 let requested='';const controller=new AbortController();
 const result=await syncPublishedSnapshot(current,'http://127.0.0.1:4318/',controller.signal,async(url,init)=>{
  requested=String(url);assert.equal(init?.signal,controller.signal);assert.equal(init?.cache,'no-store');return new Response(JSON.stringify(incoming));
 });
 assert.ok(requested.startsWith('https://first-wine-iota.vercel.app/data/official-draws.json?'));
 assert.equal(result.snapshot.fetchedAt,incoming.fetchedAt);assert.notEqual(current.fetchedAt,result.snapshot.fetchedAt);
});
test('failed, incomplete and older responses cannot replace saved newer history',async()=>{
 const before=structuredClone(current);
 const old=structuredClone(current);old.draws=Array.from({length:50},(_,i)=>({...current.draws[0],period:String(26050-i),date:new Date(Date.UTC(2026,0,50-i)).toISOString().slice(0,10)}));
 for(const payload of [old,{...current,draws:[]},{bad:true}]){
  await assert.rejects(syncPublishedSnapshot(current,'https://example.test/',undefined,async()=>new Response(JSON.stringify(payload))));
 }
 await assert.rejects(syncPublishedSnapshot(current,'https://example.test/',undefined,async()=>{throw new TypeError('offline');}));
 assert.deepEqual(current,before);
});


test('aborted synchronization does not begin a request or publish a late response',async()=>{
 const controller=new AbortController();controller.abort();let calls=0;
 await assert.rejects(syncPublishedSnapshot(current,'http://localhost/',controller.signal,async()=>{calls++;return new Response(JSON.stringify(current));}));
 assert.equal(calls,0);
 const late=new AbortController();
 await assert.rejects(syncPublishedSnapshot(current,'http://localhost/',late.signal,async()=>{late.abort();return new Response(JSON.stringify(current));}));
});


test('Pages refresh uses the live Vercel endpoint instead of waiting for its static snapshot', () => {
 const url = new URL(publishedSnapshotUrl('https://kingking543.github.io/first/', 123));
 assert.equal(url.origin, 'https://first-wine-iota.vercel.app');
 assert.equal(url.pathname, '/data/official-draws.json');
});

test('snapshot fallback never claims a successful official verification', async () => {
 const result = await syncPublishedSnapshot(current, 'https://example.test/', undefined,
  async () => new Response(JSON.stringify({...current, verification:'snapshot'})));
 assert.equal(result.verification, 'snapshot');
 assert.deepEqual(result.snapshot, current);
});

test('official result is distinguished from a downloaded backup', async () => {
 const result = await syncPublishedSnapshot(current, 'https://example.test/', undefined,
  async () => new Response(JSON.stringify({...current, verification:'official'})));
 assert.equal(result.verification, 'official');
 assert.deepEqual(result.snapshot, current);
});


test('unavailable live endpoint falls back to Pages without renewing official time', async () => {
 const urls: string[] = [];
 const result = await syncPublishedSnapshot(current, 'https://example.test/', undefined, async url => {
  urls.push(String(url));return urls.length === 1 ? new Response('',{status:503}) : new Response(JSON.stringify(current));
 });
 assert.equal(urls.length,2);assert.ok(urls[1].startsWith('https://kingking543.github.io/first/data/official-draws.json?'));
 assert.equal(result.verification,'snapshot');assert.equal(result.snapshot.fetchedAt,current.fetchedAt);
});
test('conflicting overlap cannot be accepted as live even with a newer timestamp',async()=>{
 const conflict=structuredClone(current);conflict.draws[0].front=[1,2,3,4,5];
 if(String(conflict.draws[0].front)===String(current.draws[0].front))conflict.draws[0].front=[2,3,4,5,6];
 conflict.fetchedAt=new Date(Date.parse(current.fetchedAt)+60000).toISOString();let calls=0;
 const result=await syncPublishedSnapshot(current,'https://example.test/',undefined,async()=>{
  calls++;return new Response(JSON.stringify(calls===1?{...conflict,verification:'official'}:current));
 });
 assert.deepEqual(result.snapshot,current);assert.equal(result.verification,'snapshot');
});
