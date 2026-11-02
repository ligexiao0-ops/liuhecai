const assert=require('assert'),Z=require('../betting-zodiac74'),B=require('../betting-analysis71');
const all=Array.from({length:49},(_,i)=>i+1),gz=n=>'鼠牛虎兔龙蛇马羊猴鸡狗猪'[(6-(n-1)%12+12)%12];
// Independent count by drawing 0/1 of each ball, retaining selected-zodiac mask.
function baselineDP(zs){const size=1<<zs.length,dp=Array.from({length:8},()=>Array(size).fill(0));dp[0][0]=1;let seen=0;for(const n of all){const i=zs.indexOf(gz(n)),bit=i<0?0:1<<i;for(let k=Math.min(++seen,7);k>=1;k--)for(let m=0;m<size;m++)dp[k][m|bit]+=dp[k-1][m];}return dp[7][size-1]/dp[7].reduce((s,n)=>s+n,0);}
for(const zs of [['马'],['虎'],['马','虎','蛇'],['虎','蛇','龙'],['马','虎','蛇','兔'],['马','虎','蛇','兔','牛']])assert(Math.abs(Z.fullBaseline(zs,gz)-baselineDP(zs))<1e-12);
assert.notEqual(Z.fullBaseline(['马'],gz),Z.fullBaseline(['虎'],gz));
const ranked=[...new Set(all.map(gz))],snapshot={numbers:all,zodiacs:ranked,zodiac2026Verified:true,resultSeenAtCollection:true};
const record={issue:2026200,period:200,last:snapshot,result:{n:[1,2,3,4,5,6],t:7,date:'2026-10-01'}};
const report=B.analyze([record,record],[],gz),a=Z.analyze(report,gz);assert.equal(a.n,1);assert.equal(a.rankRows.reduce((s,r)=>s+r.h,0),1);assert.equal(a.rankRows.find(r=>r.rank===7).h,1);assert.equal(a.linked.find(g=>g.id==='hot5').h,1);assert.equal(a.linked.find(g=>g.id==='cold3').h,0);
const two={...record,result:{...record.result,n:[1,13,25,2,14,26],t:38}},failed=Z.analyze(B.analyze([two],[],gz),gz).linked.find(g=>g.id==='hot5');assert.equal(failed.h,0);assert.equal(failed.meanHits,2);assert.equal(failed.distribution[2],1);
const absent=Z.analyze(B.analyze([{...record,result:null}],[],gz),gz);assert.equal(absent.n,0);assert(absent.rankRows.every(r=>r.rate===null));assert(absent.linked.every(r=>r.rate===null));
const early=Z.analyze(B.analyze([{...record,result:{...record.result,date:'2026-02-16'}}],[],gz),gz);assert.equal(early.n,0);
const retain=B.analyze([record],[],gz,{mode:'retained'});assert.equal(Z.analyze(retain,gz).n,0);
const conflict=B.analyze([record],[{p:200,n:[1,2,3,4,5,8],t:7,d:'10/01'}],gz);assert.equal(Z.analyze(conflict,gz).n,0);
const swapped={...record,issue:2026201,period:201,last:{...snapshot,zodiacs:ranked.slice().reverse()}};const chronological=Z.analyze(B.analyze([swapped,record],[],gz),gz);assert.equal(chronological.rankRows.find(r=>r.rank===7).h,1);assert.equal(chronological.rankRows.find(r=>r.rank===6).h,1);
for(const g of chronological.linked){assert.equal(g.training.n+g.check.n,g.n);assert.equal(g.distribution.reduce((s,n)=>s+n,0),g.n);assert(g.tests.every(t=>t.pool.length===g.k&&t.full===(t.hits.length===g.k)));}
console.log('PASS independent probability DP, 4/5-ball zodiac widths, each-period ranks, TE/normal/flat separation, exact 3/4/5-link success, partial-hit counts, deduplication, conflicts, pending, lunar-year and retained cohorts.');
for(const lot of ['xa','gc']){const data=require('../betting-data/'+lot+'/summary.json'),r=Z.analyze(B.analyze(data.periods,[],gz),gz);console.log(JSON.stringify({lot,archivedHistorical:true,n:r.n,teRanks:r.rankRows.map(x=>x.h),linked:r.linked.map(g=>({label:g.label,h:g.h,n:g.n,rate:g.rate,random:g.baseline,mean:g.meanHits}))}));}
