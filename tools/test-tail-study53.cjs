const assert=require('assert');require('../score-projects');const S=require('../tail-practice-study');
const z=n=>'鼠牛虎兔龙蛇马羊猴鸡狗猪'[(n-1)%12],e=n=>'金木水火土'[(n-1)%5];
const rows=Array.from({length:110},(_,i)=>{const ns=Array.from({length:7},(_,j)=>((i*13+j*11)%49)+1);return {p:150+i,n:ns.slice(0,6),t:ns[6]};});
const s=S.study(rows,z,e,'xa'),last=rows.at(-1),a=S.range(rows,'all'),seen=S.range(rows,'seen'),unseen=S.range(rows,'unseen');
assert.equal(new Set(seen.concat(unseen)).size,a.length);assert(!seen.some(n=>unseen.includes(n)));assert(a.every(n=>{const d=(n%10-last.t%10+10)%10;return d<=3||d>=7;}));
assert.equal(S.baseline(49),1);assert.equal(S.baseline(2),0);assert(S.baseline(8)>0&&S.baseline(8)<.1);
for(const mode of Object.keys(S.modes)){const t=s.summary.find(x=>x.mode===mode).tests.find(t=>t.target===200);const hist=rows.filter(r=>r.p<200);assert.deepEqual(t.pool,S.range(hist,mode));assert.deepEqual(t.hits,rows.find(r=>r.p===200).n.filter(n=>t.pool.includes(n)));}
const changed=rows.map(r=>r.p>=220?{...r,t:r.n[0],n:r.n.slice(1).concat(r.t)}:r),s2=S.study(changed,z,e,'xa');assert.equal(s.selected,s2.selected);assert.deepEqual(s.summary[0].tests.find(t=>t.target===200),s2.summary[0].tests.find(t=>t.target===200));
const ms=S.models(rows,'all',z,e,'xa',s.cut),ms2=S.models(changed,'all',z,e,'xa',s.cut);for(let i=0;i<ms.length;i++)assert.deepEqual(ms[i].tests.find(t=>t.target===200),ms2[i].tests.find(t=>t.target===200));
const broken=S.study(rows.filter(r=>r.p!==190),z,e,'la');assert(broken.skipped>0);assert(!broken.summary[0].tests.some(t=>t.target>=191&&t.target<=220));
const conflict=S.clean(rows.concat({...rows[0],n:rows[0].n.slice(1).concat(rows[0].t),t:rows[0].n[0]}));assert.deepEqual(conflict.conflicts,[150]);assert(!conflict.rows.some(r=>r.p===150));
const allowed=a.filter(n=>n<15),picked=S.pick(rows,allowed,'zodiac',z,e,'xa',ns=>!ns.includes(1));assert(picked.length<=8&&picked.every(n=>allowed.includes(n)&&n!==1));
console.log('PASS tail partitions, exact random baseline, no future leakage, missing-period and conflict handling, hard user pool');
