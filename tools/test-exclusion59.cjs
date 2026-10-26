const assert=require('assert');global.TailPracticeStudy=require('../tail-practice-study');const E=require('../exclusion-study'),C=require('../combo-limits'),R=require('../prediction-review');
const r={p:1,n:[1,8,17,28,40,49],t:15};assert.deepEqual(E.pool(r,'adjacent'),[2,7,9,16,18,27,29,39,41,48]);
assert(E.pool(r,'sumdiff','abs').includes(5));assert(!E.pool(r,'sumdiff','drop').includes(5));assert(!E.pool(r,'sumdiff','drop').includes(-5));assert(!E.pool(r,'sumdiff','abs').includes(0));
assert.equal(C.parseNumbers('【01 02 03】[04,05,06]\n07，08，09').length,3);assert.equal(C.parseNumbers('【01 01 03】[04 05 66]').length,0);assert(!C.allowed([1,2,3],C.parseNumbers('【01 02 03】')));assert(C.allowed([1,2,4],C.parseNumbers('【01 02 03】')));
const rows=Array.from({length:90},(_,i)=>{const n=Array.from({length:7},(_,j)=>(i*13+j*11)%49+1);return {p:100+i,n:n.slice(0,6),t:n[6]};});
for(const m of ['plus1','minus1','adjacent','sumdiff','ten']){const s=E.study(rows,m);assert(s.n>0);assert(s.tests.every(t=>t.target===t.source+1&&t.hits.length+t.retained===6));assert(s.zero<=s.retain3);assert(s.baseline>=0&&s.baseline<=1);assert.deepEqual(E.study(rows.slice(0,75),m).tests,s.tests.filter(t=>t.target<=rows[74].p));}
const ten=E.ten(rows);assert.equal(ten.length,10);assert.equal(new Set(ten).size,10);assert(ten.every(n=>n>=1&&n<=49));assert(Math.abs(E.zeroBaseline(10)-0.233)<.01);
for(let k=0;k<=3;k++){const draw={n:[1,2,3,4,5,6],t:7},pool=[1,2,3].slice(0,k).concat([10,11,12].slice(k));const scored=R.score({game:'z3',pool,action:'track'},draw,n=>'鼠');assert.equal(scored.hits.length,k);assert.equal(scored.success,k===3);}
assert(R.score({game:'z3',pool:[1,2,10],action:'exclude-combination'}, {n:[1,2,3,4,5,6],t:7},n=>'鼠').success);
console.log('PASS formula boundaries, negative modes, independent triple bans, walk-forward no future leakage, ten distinct numbers, exact hit counting');

assert.deepEqual(E.pool(r,'plus1'),[2,9,18,29,41]);assert.deepEqual(E.pool(r,'minus1'),[7,16,27,39,48]);for(const method of ['plus1','minus1']){const up={['zm3_exclude_'+method]:true};assert(E.pool(r,method).every(n=>!E.allowed(n,[r],up)));}
