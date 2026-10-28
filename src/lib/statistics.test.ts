import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { parseSnapshot, calculateDrawStats } from './draws.ts';
import { analyzeDrawWindow, formatOmission, rankNumbers } from './statistics.ts';
const snapshot = parseSnapshot(JSON.parse(readFileSync(new URL('../data/official-draws.json',import.meta.url),'utf8')));

test('window selection applies to totals, period/date boundaries and both zone omissions', () => {
  const before=structuredClone(snapshot.draws);
  for(const count of [10,30,50] as const){
    const analysis=analyzeDrawWindow(snapshot.draws,count);
    assert.equal(analysis.draws.length,count);
    assert.equal(analysis.draws[0].period,snapshot.draws[0].period);
    assert.equal(analysis.draws.at(-1)?.date,snapshot.draws[count-1].date);
    assert.equal(analysis.stats.frontFreq.reduce((a,b)=>a+b,0),count*5);
    assert.equal(analysis.stats.backFreq.reduce((a,b)=>a+b,0),count*2);
    for(const zone of ['front','back'] as const){
      const data=zone==='front'?analysis.stats.frontData:analysis.stats.backData;
      for(const row of data){
        const hits=snapshot.draws.slice(0,count).filter(draw=>draw[zone].includes(row.number));
        const latest=snapshot.draws.slice(0,count).findIndex(draw=>draw[zone].includes(row.number));
        assert.equal(row.freq,hits.length);
        assert.equal(row.overdue,latest<0?count:latest);
      }
    }
  }
  assert.deepEqual(snapshot.draws,before);
  assert.equal(calculateDrawStats(snapshot.draws).frontFreq.reduce((a,b)=>a+b,0),250);
});

test('omission is exact when observed and a lower bound when absent', () => {
  assert.equal(formatOmission({freq:0,overdue:10},10),'≥10期');
  assert.equal(formatOmission({freq:2,overdue:0},10),'0期');
  assert.equal(formatOmission({freq:1,overdue:9},10),'9期');
});

test('ranking handles ties consistently without mutating the numeric grid order', () => {
  const rows=[{number:3,freq:2,overdue:1},{number:1,freq:2,overdue:3},{number:2,freq:1,overdue:3}];
  assert.deepEqual(rankNumbers(rows,'freq').map(d=>d.number),[1,3,2]);
  assert.deepEqual(rankNumbers(rows,'overdue').map(d=>d.number),[1,2,3]);
  assert.deepEqual(rows.map(d=>d.number),[3,1,2]);
});
