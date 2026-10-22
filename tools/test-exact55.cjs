const assert=require('assert');require('../score-projects');const E=require('../exact-combos'),R=require('../prediction-review');
const z=n=>'鼠牛虎兔龙蛇马羊猴鸡狗猪'[(n-1)%12],e=n=>'金木水火土'[(n-1)%5];
const rows=Array.from({length:70},(_,i)=>{const ns=Array.from({length:7},(_,j)=>(i*13+j*11)%49+1);return {p:150+i,n:ns.slice(0,6),t:ns[6]};});
const pool=[47,31,21,8,7,19,12,2,36,26,14,24];
for(const mode of ['auto','zodiac','tail','element']){const out=E.select(rows,pool,z,e,{mode,priority:pool,lot:'gc',valid:ns=>!ns.includes(31)&&!(ns.includes(7)&&ns.includes(8))});assert(out.length>0&&out.length<=3,mode);for(const g of out){assert.equal(g.pool.length,3);assert.equal(new Set(g.pool).size,3);assert(g.pool.every(n=>pool.includes(n)&&n!==31));assert(!(g.pool.includes(7)&&g.pool.includes(8)));assert(mode==='auto'||g.structure[mode]);}assert.equal(new Set(out.map(g=>g.pool.slice().sort().join())).size,out.length);}
assert.deepEqual(E.select(rows,[1,2],z,e),[]);assert.deepEqual(E.select(rows,[1,2,3],z,e,{mode:'zodiac'}),[]);
const partial={p:221,n:[7,8,21,1,2,3],t:31};assert.equal(R.score({game:'z3',pool:[7,8,31]},partial,z).hits.length,2);assert(!R.score({game:'z3',pool:[7,8,31]},partial,z).success);assert(R.score({game:'z3',pool:[7,8,21]},partial,z).success);
const only=[{p:1,n:[7,8,21,1,2,3],t:31}];assert.equal(E.select(only,[7,8,31],z,e)[0].joint,0);
const a=E.select(rows.slice(0,50),pool,z,e),changed=rows.map((r,i)=>i>=50?{...r,n:r.n.slice(1).concat(r.t),t:r.n[0]}:r);assert.deepEqual(a,E.select(changed.slice(0,50),pool,z,e));
console.log('PASS exact triples, structural modes, hard combo restrictions, no future inputs and special-number exclusion');
