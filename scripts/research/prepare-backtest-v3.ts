import {readFile,writeFile} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {parseOfficialHistory,parseSnapshot} from '../../src/lib/draws.ts';
import {parseFujianHistory} from '../fetch-draws.ts';
const root=new URL('../../',import.meta.url),out=new URL('reports/backtest-2026-11-11/',root),old=new URL('reports/backtest-2026-10-28/',root);
const sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const oldManifest=JSON.parse(await readFile(new URL('data/manifest.json',old),'utf8'));
const original=[];
for(const p of oldManifest.pages){const raw=gunzipSync(await readFile(new URL(`data/page-${String(p.page).padStart(2,'0')}.json.gz`,old)));if(sha(raw)!==p.sha256)throw new Error('Original archive hash mismatch');original.push(...parseOfficialHistory(JSON.parse(raw.toString())));}
const archived=parseSnapshot({fetchedAt:new Date().toISOString(),draws:original}).draws;
const oldText=await readFile(new URL('data/history.json',old),'utf8');
const oldResults=JSON.parse(await readFile(new URL('results.json',old),'utf8'));if(sha(oldText)!==oldResults.historySha256)throw new Error('Original normalized history hash mismatch');
// The V1 research archive used a human-readable source label rather than a production source ID.
const oldDraws=parseSnapshot({...JSON.parse(oldText),source:'china-sporttery'}).draws;
const fromArchive=process.argv.includes('--from-archive');
async function input(name:string,temp:string){return fromArchive?gunzipSync(await readFile(new URL(`data/${name}.json.gz`,out))):readFile(temp);}
const rawCentral=await input('central-latest100','/private/tmp/dlt-20261111-central.json'),rawFujian=await input('fujian-latest50','/private/tmp/dlt-20261111-fujian.json'),rawPublished=await input('published-crosscheck','/private/tmp/dlt-20261111-published.json');
const central=parseOfficialHistory(JSON.parse(rawCentral.toString())),fujian=parseFujianHistory(JSON.parse(rawFujian.toString())),published=parseSnapshot(JSON.parse(rawPublished.toString()));
if(central.length!==100||central[0].period!=='26128')throw new Error('Unexpected latest official history; fix protocol cutoff explicitly');
const map=new Map(archived.map(d=>[d.period,d]));let matchedArchive=0;
for(const d of central){const saved=map.get(d.period);if(saved){if(JSON.stringify(saved)!==JSON.stringify(d))throw new Error('Changed official overlap '+d.period);matchedArchive++;}map.set(d.period,d);}
for(const d of [...fujian,...published.draws,...oldDraws]){const saved=map.get(d.period);if(!saved||JSON.stringify(saved)!==JSON.stringify(d))throw new Error('Independent official/published/history mismatch '+d.period);}
const selected=oldDraws.concat(central.filter(d=>Number(d.period)>26123)).sort((a,b)=>Number(a.period)-Number(b.period));
if(selected.length!==1055)throw new Error('Expected1050 original plus5 new');
for(let i=1;i<selected.length;i++){const a=selected[i-1],b=selected[i];if(a.date>=b.date)throw new Error('Date gap/order');if(a.period.slice(0,2)===b.period.slice(0,2)?Number(b.period)-Number(a.period)!==1:Number(b.period.slice(0,2))-Number(a.period.slice(0,2))!==1||b.period.slice(2)!=='001')throw new Error('Period gap');}
const fetchedAt=fromArchive?JSON.parse(await readFile(new URL('data/manifest.json',out),'utf8')).fetchedAt:new Date().toISOString();const history=JSON.stringify({source:'china-sporttery',fetchedAt,draws:selected},null,2)+'\n';
const sources=[{name:'central-latest100',raw:rawCentral,url:'https://webapi.sporttery.cn/gateway/lottery/getHistoryPageListV1.qry?gameNo=85&provinceId=0&pageSize=100&isVerify=1&pageNo=1',rows:100},{name:'fujian-latest50',raw:rawFujian,url:'https://www.fjtc.com.cn/data_api/lottery?type=dlt&page=1&limit=50&so_start=&so_end=',rows:50},{name:'published-crosscheck',raw:rawPublished,url:'https://first-wine-iota.vercel.app/data/official-draws.json',rows:50}];
if(process.argv.includes('--check-only')){const saved=JSON.parse(await readFile(new URL('data/manifest.json',out),'utf8'));if(sha(history)!==saved.historySha256)throw new Error('Archived reconstruction checksum mismatch');console.log('PASS: archived official responses reproduce the exact normalized input history');process.exit(0);}
for(const s of sources)await writeFile(new URL(`data/${s.name}.json.gz`,out),gzipSync(s.raw));
await writeFile(new URL('data/history.json',out),history);
await writeFile(new URL('data/manifest.json',out),JSON.stringify({fetchedAt,sources:sources.map(({raw,...s})=>({...s,rawSha256:sha(raw)})),originalManifest:'../../backtest-2026-10-28/data/manifest.json',originalManifestSha256:sha(await readFile(new URL('data/manifest.json',old))),originalArchivedRecords:archived.length,originalUsedRecords:oldDraws.length,matchedCentralArchive:matchedArchive,matchedFujian:50,matchedPublished:published.draws.length,normalizedRecords:selected.length,targets:selected.length-50,forwardTargets:selected.filter(d=>Number(d.period)>26123).map(d=>({period:d.period,date:d.date})),historySha256:sha(history)},null,2)+'\n');
console.log(JSON.stringify({records:selected.length,targets:selected.length-50,latest:selected.at(-1),newTargets:selected.filter(d=>Number(d.period)>26123).map(d=>d.period),matchedCentralArchive:matchedArchive,matchedFujian:50,matchedPublished:published.draws.length}));
