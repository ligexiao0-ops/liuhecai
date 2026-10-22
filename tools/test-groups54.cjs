const assert=require('assert'),G=require('../combo-limits');
for(const raw of ['【鼠牛虎】[牛虎兔]','（鼠牛虎）(牛虎兔)','鼠牛虎/牛虎兔','鼠牛虎，牛虎兔','A:鼠牛虎 B:牛虎兔']){const g=G.parse(raw);assert.equal(g.length,2,raw);assert(g.every(x=>x.max===2&&x.zods.length===3),raw);assert(!G.allowed(['鼠','牛','虎'],g));assert(G.allowed(['鼠','牛','龙','蛇','马'],g));}
let g=G.parse('【鼠牛虎兔龍蛇】最多四个');assert.equal(g[0].max,4);assert(!G.allowed(['鼠','牛','虎','兔','龙'],g));assert(G.allowed(['鼠','牛','虎','兔','马'],g));
g=G.parse('每组最多三个；【鼠牛虎兔龙】[牛虎兔龙蛇马]最多二个');assert.equal(g[0].max,3);assert.equal(g[1].max,2);
assert.equal(G.parse('【鼠牛虎】最多0个')[0].max,0);assert.equal(G.parse('没有生肖分组').length,0);
require('../score-projects');const S=require('../tail-practice-study'),z=n=>'鼠牛虎兔龙蛇马羊猴鸡狗猪'[(n-1)%12],e=n=>'金木水火土'[(n-1)%5];
const rows=Array.from({length:100},(_,i)=>{const ns=Array.from({length:7},(_,j)=>(i*13+j*11)%49+1);return {p:150+i,n:ns.slice(0,6),t:ns[6]};});
const pool=S.range(rows,'all'),seen=S.range(rows,'seen'),unseen=S.range(rows,'unseen');
let eight=S.pick(rows,pool,'mixed',z,e,'gc');assert.equal(eight.filter(n=>seen.includes(n)).length,5);assert.equal(eight.filter(n=>unseen.includes(n)).length,3);
eight=S.pick(rows,seen,'mixed',z,e,'gc');assert(eight.length<=5);assert(eight.every(n=>seen.includes(n)));
const constrained=pool.filter(n=>n<=20);eight=S.pick(rows,constrained,'mixed',z,e,'gc',ns=>!ns.includes(1));assert(eight.every(n=>constrained.includes(n)&&n!==1));
const cut=80,models=S.models(rows,'all',z,e,'gc',cut),changed=rows.map((r,i)=>i>=90?{...r,n:r.n.slice(1).concat(r.t),t:r.n[0]}:r),next=S.models(changed,'all',z,e,'gc',cut);
assert.deepEqual(models.at(-1).tests.filter(t=>t.target<240),next.at(-1).tests.filter(t=>t.target<240));
console.log('PASS group separators, independent caps, mixed 5/3 without cross-fill, hard pool and no future leakage');
