'use strict';
// Isolated regression checks: no browser state, network, credentials, or live records.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = path.resolve(__dirname, '..');
const scripts = ['prediction-review.js', 'constraint-tracker.js'].map(f => [f, fs.readFileSync(path.join(base, f), 'utf8')]);
const plain = value => JSON.parse(JSON.stringify(value));
function environment(prefs = {}, build = {id:'10101067'}) {
  const z = '鼠牛虎兔龙蛇马羊猴鸡狗猪'.split('');
  const source = {p:282,n:[7,8,9,10,11,12],t:13};
  const ctx = {
    console, UP:{practice_forecasts:[],...prefs}, LAST:source, NEXT:283, DR:[source],
    CUR_LOT:'xa', activeTab:'te', APP_BUILD:build,
    gz:n=>z[(n-1)%12], gtl:n=>n%10, ghd:n=>Math.floor(n/10),
    gwx:()=> '木', gwv:()=> '红', gdf:()=> 0, ghesum:n=>Math.floor(n/10)+n%10,
    gsz:n=>n<=24?'小':'大', gpar:n=>n%2?'单':'双', ghe:()=> '合单', gfam:()=> '野兽',
    COMBOS:[], winCurOff:()=>0, saveCalls:0,
    saveData(){ctx.saveCalls++;}, render(){if(ctx.onBaseRender)ctx.onBaseRender();},
    document:{getElementById:()=>null}
  };
  ctx.window=ctx;ctx.self=ctx;
  vm.createContext(ctx);
  for(const [filename,code] of scripts)vm.runInContext(code,ctx,{filename});
  return ctx;
}
function saved(overrides={}) {
  return {lot:'xa',sourcePeriod:282,targetPeriod:283,game:'lx',arm:'manual-choice',
    strategy:'constraint:lx_force_zods',action:'track',modelVersion:'10101066',
    pool:['鼠','牛','虎','兔','龙'],label:'测试五连肖',savedAt:'2026-10-01T01:00:00.000Z',...overrides};
}
let count=0;
function check(name,fn){fn();count++;console.log('PASS '+name);}

check('fixed five-zodiac selection with two hits is wrong in every review panel',()=>{
  const c=environment(),r=saved(),draw={p:283,n:[1,13,25,2,14,26],t:37};
  c.UP.practice_forecasts=[r];c.DR.push(draw);
  const result=c.ManualConstraintTracker.evaluate(r,draw,c.gz);
  assert.deepEqual(plain(result.score.hits),['鼠','牛']);
  assert.equal(result.score.success,false);
  assert.equal(c.PredictionReview.score(r,draw,c.gz).success,false);
  assert.equal(c.ManualConstraintTracker.summary()[0].rate,0);
  assert.match(c.ManualConstraintTracker.report(),/第283期 错 · 生肖命中 2\/5/);
});
check('three/four/five linked zodiac rules all require their full group',()=>{
  const c=environment(),draw={p:283,n:[1,2,3,4,13,14],t:25};
  for(const [pool,success] of [[['鼠','牛','虎'],true],[['鼠','牛','虎','兔'],true],[['鼠','牛','虎','兔','龙'],false]]){
    assert.equal(c.PredictionReview.score(saved({pool}),draw,c.gz).success,success);
  }
});
check('cannot backfill a target already present while LAST/NEXT are stale',()=>{
  const c=environment({te_pick_pool:[17]});
  c.DR.push({p:283,n:[1,2,3,4,5,6],t:17});
  assert.equal(c.ManualConstraintTracker.capture(),false);
  assert.equal(c.UP.practice_forecasts.length,0);
  c.saveData();assert.equal(c.UP.practice_forecasts.length,0);
});
check('repeated render and save never duplicate or rewrite snapshots',()=>{
  const c=environment({te_pick_pool:[17]});
  assert.equal(c.ManualConstraintTracker.capture(),true);
  const original=plain(c.UP.practice_forecasts),savedAt=original[0].savedAt;
  c.render();c.render();c.saveData();c.saveData();
  assert.equal(c.UP.practice_forecasts.length,1);
  assert.equal(c.UP.practice_forecasts[0].savedAt,savedAt);
  assert.deepEqual(plain(c.UP.practice_forecasts),original);
});
check('render captures the refreshed next period after derived state updates',()=>{
  const c=environment({te_pick_pool:[17]}),nextDraw={p:283,n:[1,2,3,4,5,6],t:17};
  c.DR.push(nextDraw);
  c.onBaseRender=()=>{c.LAST=nextDraw;c.NEXT=284;};
  c.render();
  assert.equal(c.UP.practice_forecasts.length,1);
  assert.equal(c.UP.practice_forecasts[0].sourcePeriod,283);
  assert.equal(c.UP.practice_forecasts[0].targetPeriod,284);
});
check('uses APP_BUILD id with 10101067 fallback',()=>{
  for(const [build,version]of [[{id:'10101099'},'10101099'],[null,'10101067']]){
    const c=environment({te_pick_pool:[17]},build);
    c.ManualConstraintTracker.capture();assert.equal(c.UP.practice_forecasts[0].modelVersion,version);
  }
});
check('old string-number mutual exclusion is normalized without changing history',()=>{
  const c=environment(),r=saved({game:'z3',strategy:'constraint:zm3_no_together',action:'exclude-combination',pool:['01','2'],maxHits:1});
  const before=JSON.stringify(r),draw={p:283,n:[1,2,20,30,40,49],t:3};
  const result=c.PredictionReview.score(r,draw,c.gz);
  assert.deepEqual(plain(result.hits),[1,2]);assert.equal(result.success,false);
  assert.equal(JSON.stringify(r),before);
});
check('legacy mixed number and zodiac rules evaluate six normal balls only',()=>{
  const c=environment(),r=saved({game:'z3',strategy:'constraint:zm3_no_together',action:'exclude-combination',pool:['虎','17'],maxHits:1});
  assert.equal(c.PredictionReview.score(r,{n:[3,17,20,30,40,49],t:2},c.gz).success,false);
  const onlySpecial=c.PredictionReview.score(r,{n:[1,2,4,5,6,7],t:17},c.gz);
  assert.equal(onlySpecial.hits.length,0);assert.equal(onlySpecial.success,true);
  assert.equal(r.pool[1],'17');
});
check('new mixed rules use a numeric pool and preserve original selector terms',()=>{
  const c=environment({zm3_no_together:[['虎','17']]});c.ManualConstraintTracker.capture();
  const r=c.UP.practice_forecasts[0];
  assert.ok(r.pool.every(n=>typeof n==='number'));
  assert.deepEqual(plain(r.values),['虎',17]);
  assert.equal(c.PredictionReview.score(r,{n:[3,17,20,30,40,49],t:2},c.gz).success,false);
});
check('normal numeric group limits save the cap and score it correctly',()=>{
  const c=environment({zm3_group_limits:[{pool:['01','02','03'],max:2}]});
  assert.equal(c.ManualConstraintTracker.capture(),true);
  const r=c.UP.practice_forecasts[0];
  assert.equal(r.strategy,'constraint:zm3_group_limits');assert.equal(r.maxHits,2);
  assert.deepEqual(plain(r.pool),[1,2,3]);
  assert.equal(c.PredictionReview.score(r,{n:[1,2,20,30,40,49],t:3},c.gz).success,true);
  assert.equal(c.PredictionReview.score(r,{n:[1,2,3,30,40,49],t:4},c.gz).success,false);
});
check('same pool with different caps remains separate; each target counts once',()=>{
  const c=environment({zm3_group_limits:[{pool:[1,2,3],max:1},{pool:[3,2,1],max:2}]});
  c.ManualConstraintTracker.capture();assert.equal(c.UP.practice_forecasts.length,2);
  const r=c.UP.practice_forecasts[0],before=JSON.stringify(r);
  c.UP.practice_forecasts.push({...r,savedAt:'2099-01-01T00:00:00.000Z',recordId:'legacy-duplicate'});
  c.DR.push({p:283,n:[1,2,20,30,40,49],t:3});
  const summary=c.ManualConstraintTracker.summary();assert.equal(summary.length,2);
  assert.ok(summary.every(x=>x.done===1));
  assert.deepEqual(plain(summary.map(x=>x.rate).sort((a,b)=>a-b)),[0,100]);
  assert.equal(JSON.stringify(r),before);
  assert.match(c.ManualConstraintTracker.report(),/最多命中1项/);
  assert.match(c.ManualConstraintTracker.report(),/最多命中2项/);
});
check('cumulative accuracy counts distinct target periods',()=>{
  const c=environment(),a=saved({game:'z3',strategy:'constraint:zm3_group_limits',action:'exclude-combination',pool:[1,2,3],maxHits:2});
  c.UP.practice_forecasts=[a,{...a,targetPeriod:284,savedAt:'2026-10-02T01:00:00.000Z'}];
  c.DR.push({p:283,n:[1,2,20,30,40,49],t:3},{p:284,n:[1,2,3,30,40,49],t:4});
  const summary=c.ManualConstraintTracker.summary()[0];
  assert.equal(summary.done,2);assert.equal(summary.hit,1);assert.equal(summary.rate,50);
});
check('invalid legacy selector is clearly pending verification and excluded from accuracy',()=>{
  const c=environment(),r=saved({game:'z3',strategy:'constraint:zm3_no_together',action:'exclude-combination',pool:['虎','bad']});
  c.UP.practice_forecasts=[r];c.DR.push({p:283,n:[1,2,3,4,5,6],t:7});
  assert.equal(c.PredictionReview.score(r,c.DR[1],c.gz),null);
  const s=c.ManualConstraintTracker.summary()[0];assert.equal(s.done,0);assert.equal(s.rate,null);assert.equal(s.needsReview,1);
  assert.match(c.ManualConstraintTracker.report(),/待核对/);
});
check('all selected TE compound conditions are intersected',()=>{
  const c=environment({te_pick_combos:['even','small']});
  c.COMBOS=[{k:'even',fn:n=>n%2===0},{k:'small',fn:n=>n<=10}];
  c.ManualConstraintTracker.capture();
  assert.deepEqual(plain(c.UP.practice_forecasts[0].pool),[2,4,6,8,10]);
});
console.log('Constraint tracker v67: '+count+' isolated checks passed.');
