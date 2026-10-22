const assert=require('assert');require('../score-projects');const E=require('../exact-combos'),z=n=>'鼠牛虎兔龙蛇马羊猴鸡狗猪'[(n-1)%12],e=n=>'金木水火土'[(n-1)%5];
const rows=Array.from({length:90},(_,i)=>{const ns=Array.from({length:7},(_,j)=>(i*13+j*11)%49+1);return {p:150+i,n:ns.slice(0,6),t:ns[6]};});
for(const pool of [Array.from({length:9},(_,i)=>10+i),Array.from({length:14},(_,i)=>5+i)]){
const a=E.select(rows,pool,z,e,{priority:pool,lot:'xa'});assert(a.length&&a.every(g=>g.pool.length===3&&!E.run3(g.pool)&&g.pool.every(n=>pool.includes(n))));const b=E.select(rows,pool.slice().reverse(),z,e,{priority:pool,lot:'xa'});assert.deepEqual(a,b);const c=E.select(rows,pool,z,e);assert.deepEqual(c,E.select(rows,pool.slice().reverse(),z,e));}
let a=E.select(rows,[5,6,7],z,e);assert.equal(a.length,1);assert(a[0].run);assert.deepEqual(new Set(a[0].pool),new Set([5,6,7]));
a=E.select(rows,[5,6,7,8,9],z,e,{valid:ns=>ns.every(n=>n<=7)});assert(a[0].run);assert(a.every(g=>g.pool.every(n=>n<=7)));
const support=E.zodiacSupport(rows,z);assert(Object.values(support).every(v=>v.hits<=v.n&&v.baseline>0&&v.baseline<1));
const tOnly=rows.map(r=>({...r,n:r.n.filter(n=>z(n)!=='鼠')}));assert.equal(E.zodiacSupport(tOnly,z)['鼠'].hits,0);
assert(E.zodiacSupport(tOnly,z)['鼠'].points<0);assert(E.select(tOnly,[1,13,25,2,3],z,e).some(g=>g.pool.includes(1)||g.pool.includes(13)||g.pool.includes(25)));
const hist=rows.slice(0,60);assert.deepEqual(E.select(hist,[5,6,7,8,9,10,11,12],z,e),E.select(rows.slice(0,60),[5,6,7,8,9,10,11,12],z,e));
console.log('PASS unordered candidate invariance, no default three-run, forced run preserves pool, auto normal-zodiac support without unverified hard exclusion');
