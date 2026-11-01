const assert=require('assert'),B=require('../betting-analysis71');
const all=Array.from({length:49},(_,i)=>i+1),z=n=>'鼠牛虎兔龙蛇马羊猴鸡狗猪'[(6-(n-1)%12+12)%12],animals=['马',...[...'鼠牛虎兔龙蛇羊猴鸡狗猪']];
const snapshot={numbers:all,zodiacs:animals,resultSeenAtCollection:true,zodiac2026Verified:true,collectedAt:'2026-10-30T14:00:00Z',websiteUpdatedAt:'2026-10-30 21:35:00'};
const periods=Array.from({length:40},(_,i)=>({issue:2026200+i,period:200+i,first:snapshot,last:snapshot,retained:null,result:{n:[1,2,3,4,5,6],t:48,date:'2026-10-01'}}));
let a=B.analyze(periods,[],z);assert.equal(a.items.length,40);const hot=a.summaries.find(s=>s.id==='nh5');assert.equal(hot.h,0);assert.equal(hot.exclude,1);assert(Math.abs(hot.baseline-5/49)<1e-12);assert.equal(hot.meanNormal,5);
const horse=a.summaries.find(s=>s.id==='zh1');assert.equal(horse.h,0);assert.equal(horse.flatAny,1);assert.equal(horse.normalAny,1);assert(Math.abs(horse.baseline-5/49)<1e-12);assert.equal(horse.training.n+horse.check.n,40);assert.equal(horse.check.n,12);
assert(B.interpretation(a).includes('开奖后'));assert(!B.interpretation(a).includes('已证明'));
assert.equal(B.analyze(periods,[],z,{mode:'retained'}).items.length,0,'Backfilled final rankings must not enter retained evidence');
const saved=periods.map(r=>({...r,retained:{...snapshot,resultSeenAtCollection:false}}));assert.equal(B.analyze(saved,[],z,{mode:'retained'}).items.length,40);
assert.equal(B.analyze([periods[0],periods[0]],[],z).items.length,1,'Each issue counts once');
let bad=B.analyze([periods[0]],[{p:200,d:'10/01',n:[1,2,3,4,5,7],t:48}],z);assert.equal(bad.conflicts.length,1);assert.equal(bad.items.length,0);
bad=B.analyze([periods[0]],[{p:200,n:[1,1,3,4,5,6],t:48}],z);assert.equal(bad.conflicts.length,1);
let pending=B.analyze([{...periods[0],result:null}],[],z);assert.equal(pending.pending.length,1);assert.equal(pending.summaries[0].rate,null);
const before=B.analyze([{...periods[0],result:{...periods[0].result,date:'2026-02-16'}}],[],z);assert.equal(before.items.length,1);assert.equal(before.summaries.find(s=>s.id==='zh1').n,0);
assert.equal(B.analyze([{...periods[0],last:{...snapshot,numbers:[...all.slice(1),49]}}],[],z).invalid.length,1);
assert(B.validDraw({n:[1,2,3,4,5,6],t:7}));assert(!B.validDraw({n:[1,2,3,4,5,6],t:6}));assert.equal(B.any(0,7),0);assert.equal(B.any(49,7),1);
const reversed=B.analyze([periods[0]],[{p:200,d:'10/01',n:[6,5,4,3,2,1],t:48}],z);assert.equal(reversed.items.length,1);assert.equal(reversed.items[0].resultSource,'本机录入');
console.log('PASS random-width baselines, high exclusion baseline, normal/TE/zodiac separation, historical vs retained provenance, chronological split, duplicate issues, result conflicts, pending results, lunar-year eligibility and invalid ranking quarantine.');

