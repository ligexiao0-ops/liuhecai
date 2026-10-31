const assert=require('assert'),Z=require('../zodiac-single70'),R=require('../random-triples69');
const z=n=>'鼠牛虎兔龙蛇马羊猴鸡狗猪'[(n-1)%12],rank=[13,...Array.from({length:49},(_,i)=>i+1)],pool=Z.choose(rank,z);
assert.equal(pool.length,12);assert.equal(new Set(pool.map(z)).size,12);assert.equal(pool[0],13);assert(!pool.includes(1));
const noMouse=Z.choose(rank,z,n=>z(n)!=='鼠');assert.equal(noMouse.length,11);assert(!noMouse.some(n=>z(n)==='鼠'));
assert.deepEqual(Z.choose([1,13,25],z,n=>n!==1),[13]);assert.deepEqual(Z.choose([0,50,1,1,2],z),[1,2]);
assert.deepEqual(R.parseManual('０１，07 12\n35;49 50 2026 第292期'),[1,7,12,35,49]);
console.log('PASS one number per permitted zodiac, ranked choice without lowest-number bias, no excluded-zodiac backfill and custom pool parsing.');
