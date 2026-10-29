(function(root){'use strict';
const VERSION=String(root.APP_BUILD&&root.APP_BUILD.id||'10101067'),Z='鼠牛虎兔龙蛇马羊猴鸡狗猪'.split(''),A=Array.from({length:49},(_,i)=>i+1),fmt=n=>typeof n==='number'?String(n).padStart(2,'0'):n,uniq=a=>[...new Set(a||[])];
const pickSpec={te:[['号码','te_pick_pool',n=>true],['生肖','te_pick_zods',n=>(UP.te_pick_zods||[]).includes(gz(n))],['尾数','te_pick_tails',n=>(UP.te_pick_tails||[]).includes(gtl(n))],['头数','te_pick_heads',n=>(UP.te_pick_heads||[]).includes(ghd(n))],['五行','te_pick_wx_multi',n=>(UP.te_pick_wx_multi||[]).includes(gwx(n))],['波色','te_pick_wv_multi',n=>(UP.te_pick_wv_multi||[]).includes(gwv(n))],['差数','te_pick_diffs',n=>(UP.te_pick_diffs||[]).includes(gdf(n))],['合数值','te_pick_hesums',n=>(UP.te_pick_hesums||[]).includes(ghesum(n))],['属性','te_pick_attrs',n=>{const f={生肖:gz,大小:gsz,单双:gpar,合数:ghe,家野:gfam,波色:gwv,五行:gwx,头数:ghd,尾数:gtl};const a=Object.keys(UP.te_pick_attrs||{}).filter(k=>UP.te_pick_attrs[k]&&f[k]);return a.length>0&&a.every(k=>f[k](n)===UP.te_pick_attrs[k]);}]]};
const excludeSpec={te:[['号码','te_excl_nums',n=>(UP.te_excl_nums||[]).includes(n)],['排除池','te_excl_pool',n=>(UP.te_excl_pool||[]).includes(n)],['生肖','te_excl_zods',n=>(UP.te_excl_zods||[]).includes(gz(n))],['尾数','te_excl_tails',n=>(UP.te_excl_tails||[]).includes(gtl(n))],['头数','te_excl_heads',n=>(UP.te_excl_heads||[]).includes(ghd(n))],['五行','te_excl_wx_multi',n=>(UP.te_excl_wx_multi||[]).includes(gwx(n))],['波色','te_excl_wv_multi',n=>(UP.te_excl_wv_multi||[]).includes(gwv(n))],['差数','te_excl_diffs',n=>(UP.te_excl_diffs||[]).includes(gdf(n))],['合数值','te_excl_hesums',n=>(UP.te_excl_hesums||[]).includes(ghesum(n))],['属性','te_excl_attrs',n=>attrRejectPool(UP.te_excl_attrs||{}).includes(n)]],
 z3:[['号码','zm3_excl_nums',n=>(UP.zm3_excl_nums||[]).includes(n)],['生肖','zm3_excl_zods',n=>(UP.zm3_excl_zods||[]).includes(gz(n))],['尾数','zm3_excl_tails',n=>(UP.zm3_excl_tails||[]).includes(gtl(n))],['五行','zm3_excl_wx_multi',n=>(UP.zm3_excl_wx_multi||[]).includes(gwx(n))],['属性','zm3_excl_attrs',n=>attrRejectPool(UP.zm3_excl_attrs||{}).includes(n)]],
 lx:[['生肖','lx_excl_zods',n=>(UP.lx_excl_zods||[]).includes(n)|| (UP.lx_ban_zods||[]).includes(n)]],pt:[['生肖','pt_excl_zods',n=>(UP.pt_excl_zods||[]).includes(n)]]};
const exclusions={te:excludeSpec.te,z3:excludeSpec.z3,lx:excludeSpec.lx,pt:excludeSpec.pt};
function attrPool(game,key,obj){const f={生肖:gz,大小:gsz,单双:gpar,合数:ghe,家野:gfam,波色:gwv,五行:gwx,头数:ghd,尾数:gtl,差数:gdf,合数值:ghesum},ks=Object.keys(obj||{}).filter(k=>f[k]&&obj[k]);return A.filter(n=>ks.length>0&&ks.every(k=>f[k](n)===obj[k]));}
function attrRejectPool(obj){const f={生肖:gz,大小:gsz,单双:gpar,合数:ghe,家野:gfam,波色:gwv,五行:gwx,头数:ghd,尾数:gtl,差数:gdf,合数值:ghesum},ks=Object.keys(obj||{}).filter(k=>f[k]&&obj[k]);return A.filter(n=>ks.some(k=>f[k](n)===obj[k]));}
function picks(game){const all=game==='te'?A:game==='z3'?A:Z,rows=pickSpec[game]||[];let pools=[];for(const [label,key,fn]of rows){const val=key==='te_pick_pool'?(UP[key]||[]):key==='te_pick_attrs'?UP[key]||{}:UP[key]||[];if(!Array.isArray(val)&&!Object.keys(val).length)continue;if(Array.isArray(val)&&!val.length)continue;let pool=key==='te_pick_pool'?uniq(val).filter(n=>A.includes(n)):key==='te_pick_attrs'?attrPool(game,key,val):all.filter(fn);if(pool.length)pools.push({key,label,pool:uniq(pool)});}
 if(game==='z3'){for(const [label,key,fn]of [['生肖','zm3_pick_zods',n=>(UP.zm3_pick_zods||[]).includes(gz(n))],['尾数','zm3_pick_tails',n=>(UP.zm3_pick_tails||[]).includes(gtl(n))]])if((UP[key]||[]).length)pools.push({key,label,pool:A.filter(fn)});if((UP.zm3_pick_pool||[]).length)pools.unshift({key:'zm3_pick_pool',label:'号码',pool:uniq(UP.zm3_pick_pool).filter(n=>A.includes(n))});if(Object.keys(UP.zm3_pick_attrs||{}).length)pools.push({key:'zm3_pick_attrs',label:'属性',pool:attrPool(game,'zm3_pick_attrs',UP.zm3_pick_attrs)});}
 if(game==='te'){for(const [k,fn,label]of [['te_pick_combos',n=>(UP.te_pick_combos||[]).every(key=>{const c=COMBOS.find(x=>x.k===key);return c&&c.fn(n);}), '组合']])if((UP[k]||[]).length)pools.push({key:k,label,pool:A.filter(fn)});}
 if(game==='lx'){for(const [key,label]of [['lx_force_zods','生肖'],['lx_custom6_zods','自选生肖']])if((UP[key]||[]).length)pools.push({key,label,pool:uniq(UP[key]).filter(z=>Z.includes(z))});}
 if(game==='pt'&&(UP.pt_force_zods||[]).length)pools.push({key:'pt_force_zods',label:'平特肖生肖',pool:uniq(UP.pt_force_zods).filter(z=>Z.includes(z))});
 if(!pools.length)return [];const joint=all.filter(x=>pools.every(p=>p.pool.includes(x)));const out=pools.map(p=>({...p,action:'track'}));if(pools.length>1)out.push({key:'combined-picks:'+pools.map(x=>x.key).join(','),label:'当前选择条件交集',pool:joint,action:'track'});return out;}
function excluded(game){const all=game==='te'||game==='z3'?A:Z,rows=exclusions[game]||[],out=[];for(const [label,key,fn]of rows){const v=UP[key];if(key.endsWith('_attrs')?!Object.keys(v||{}).length:!Array.isArray(v)||!v.length)continue;const pool=all.filter(fn);if(pool.length)out.push({key,label,pool,action:'exclude'});}const union=uniq(out.flatMap(x=>x.pool));if(out.length>1&&union.length)out.push({key:'combined-exclusions:'+out.map(x=>x.key).join(','),label:'当前排除条件并集',pool:union,action:'exclude'});return out;}
function normalizedMember(value){
 if(typeof value==='number'&&Number.isInteger(value)&&value>=1&&value<=49)return value;
 if(typeof value==='string'&&Z.includes(value.trim()))return value.trim();
 if(typeof value==='string'&&/^\d{1,2}$/.test(value.trim())){const n=Number(value);if(n>=1&&n<=49)return n;}
 return null;
}
function normalizedPool(game,pool){
 const values=(Array.isArray(pool)?pool:[]).map(normalizedMember);
 const isZodiac=game==='lx'||game==='pt';
 if(values.some(v=>v===null||(isZodiac?typeof v!=='string':typeof v!=='number')))return null;
 return uniq(values);
}
function canonical(values){return uniq(values).slice().sort((a,b)=>String(a).localeCompare(String(b))).join(',');}
function limitFor(r){return Number(r.maxHits??(r.strategy==='constraint:zm3_no_together'?1:r.game==='lx'?(r.pool||[]).length-1:2));}
function identity(r,includeVersion){
 const members=(r.values||[]).map(normalizedMember),pool=(r.pool||[]).map(normalizedMember);
 return [r.game,r.action||'track',r.strategy||'',canonical(pool),canonical(members),r.action==='exclude-combination'?limitFor(r):'',includeVersion?r.modelVersion||'旧版':''].join('|');
}
function captureContext(){
 if(typeof UP==='undefined'||!UP||typeof LAST==='undefined'||!LAST||typeof NEXT!=='number'||!Number.isInteger(NEXT)||!Array.isArray(DR)||!DR.length)return null;
 if(typeof winCurOff==='function'&&winCurOff()>0)return null;
 const latest=DR.reduce((a,b)=>Number(b.p)>Number(a.p)?b:a);
 // A save may run after DR changed but before calcDerived refreshed LAST/NEXT.
 // Do not create a forecast for an outcome already available in the record set.
 if(LAST.p!==latest.p||NEXT!==latest.p+1||DR.some(r=>r.p===NEXT))return null;
 return {sourcePeriod:latest.p,targetPeriod:NEXT};
}
function records(meta){
 const specs=[];
 for(const game of ['te','z3','lx','pt'])specs.push(...picks(game).map(x=>({...x,game})),...excluded(game).map(x=>({...x,game})));
 for(const item of UP.zm3_no_together||[]){
  if(!Array.isArray(item)||item.length<2)continue;
  const members=uniq(item.map(normalizedMember));if(members.some(x=>x===null))continue;
  const mixed=members.some(x=>typeof x==='string');
  const pool=mixed?A.filter(n=>members.some(x=>typeof x==='number'?x===n:gz(n)===x)):members;
  specs.push({game:'z3',key:'zm3_no_together',label:'禁止同组（最多1项）',pool,values:mixed?members:undefined,action:'exclude-combination',maxHits:1});
 }
 for(const item of UP.zm3_group_limits||[]){
  if(!item||!Array.isArray(item.pool)||!item.pool.length)continue;
  const pool=normalizedPool('z3',item.pool),max=Number(item.max??item.maxHits??2);
  if(!pool||!pool.length||!Number.isInteger(max)||max<0||max>pool.length)continue;
  specs.push({game:'z3',key:'zm3_group_limits',label:'正码组最多'+max+'码',pool,action:'exclude-combination',maxHits:max});
 }
 for(const item of UP.lx_no_together||[]){
  if(!Array.isArray(item)||item.length<2)continue;
  const pool=normalizedPool('lx',item),max=Number(item.maxHits??item.max??1);
  if(pool&&Number.isInteger(max)&&max>=0&&max<=pool.length)specs.push({game:'lx',key:'lx_no_together',label:'连肖禁止同组（最多'+max+'肖）',pool,action:'exclude-combination',maxHits:max});
 }
 for(const item of UP.lx_grp_limits||[]){
  if(!item||!Array.isArray(item.zods)||!item.zods.length)continue;
  const pool=normalizedPool('lx',item.zods),max=Number(item.max??item.limit??item.zods.length-1);
  if(pool&&Number.isInteger(max)&&max>=0&&max<=pool.length)specs.push({game:'lx',key:'lx_grp_limits',label:'连肖组最多'+max+'肖',pool,action:'exclude-combination',maxHits:max});
 }
 const seen=new Set((UP.practice_forecasts||[]).filter(r=>r.lot===CUR_LOT&&r.arm==='manual-choice').map(r=>r.targetPeriod+'|'+identity(r,false))),out=[];
 for(const x of specs){
  const pool=normalizedPool(x.game,x.pool);if(!pool||!pool.length)continue;
  const r={lot:CUR_LOT,...meta,game:x.game,modelVersion:VERSION,arm:'manual-choice',strategy:'constraint:'+x.key,action:x.action,maxHits:x.maxHits,pool,label:(x.action.indexOf('exclude')===0?'排除':'选择')+x.label+' · '+(x.values||pool).map(fmt).join(' '),savedAt:new Date().toISOString(),source:'保存时目标期尚未录入'};
  if(x.values)r.values=x.values.slice();
  const sig=r.targetPeriod+'|'+identity(r,false);if(seen.has(sig))continue;seen.add(sig);
  r.recordId='manual-choice:'+CUR_LOT+'|'+sig;out.push(r);
 }
 return out;
}
function capture(){
 const meta=captureContext();if(!meta)return false;
 const add=records(meta);if(!add.length)return false;
 UP.practice_forecasts=UP.practice_forecasts||[];UP.practice_forecasts.push(...add);return true;
}
const standardScore=root.PredictionReview.score;
function evaluate(r,draw,zod){
 if(!draw)return {score:null,needsReview:false};
 if(!r||!Array.isArray(r.pool))return {score:null,needsReview:true,reason:'原记录缺少候选集合'};
 const zodiac=zod||gz;
 // Legacy normal mutual-exclusion rules may mix zodiac names and number strings.
 // Evaluate membership against the six normal balls; retain the original record.
 if(r.game==='z3'&&r.strategy==='constraint:zm3_no_together'){
  const members=uniq((r.values||r.pool).map(normalizedMember));
  if(members.some(x=>x===null)||members.length<2)return {score:null,needsReview:true,reason:'旧互斥条件格式待核对'};
  const max=Number(r.maxHits??1);if(!Number.isInteger(max)||max<0||max>members.length)return {score:null,needsReview:true,reason:'命中上限待核对'};
  const hits=members.filter(x=>typeof x==='number'?draw.n.includes(x):draw.n.some(n=>zodiac(n)===x));
  return {score:{hits,success:hits.length<=max},needsReview:false};
 }
 const pool=normalizedPool(r.game,r.pool);
 if(!pool||!pool.length)return {score:null,needsReview:true,reason:'号码／生肖格式待核对'};
 if(r.action==='exclude-combination'){
  const max=limitFor({...r,pool});if(!Number.isInteger(max)||max<0||max>pool.length)return {score:null,needsReview:true,reason:'命中上限待核对'};
 }
 return {score:standardScore({...r,pool},draw,zodiac),needsReview:false};
}
// All existing review panels receive the same result for a manual snapshot.
root.PredictionReview.score=function(r,draw,zod){return r&&r.arm==='manual-choice'?evaluate(r,draw,zod).score:standardScore(r,draw,zod);};
function drawOf(p){return DR.find(r=>r.p===p)||null;}
function summary(){
 const groups=new Map();
 for(const r of UP.practice_forecasts||[]){
  if(r.lot!==CUR_LOT||r.arm!=='manual-choice'||!Array.isArray(r.pool))continue;
  const key=identity(r,true);if(!groups.has(key))groups.set(key,new Map());
  const periods=groups.get(key),old=periods.get(r.targetPeriod);
  if(!old||(Date.parse(r.savedAt)||Infinity)<(Date.parse(old.savedAt)||Infinity))periods.set(r.targetPeriod,r);
 }
 return [...groups.values()].map(periods=>{
  const xs=[...periods.values()].sort((a,b)=>a.targetPeriod-b.targetPeriod).map(r=>({r,...evaluate(r,drawOf(r.targetPeriod),gz)})),last=xs.at(-1),done=xs.filter(x=>x.score),hit=done.filter(x=>x.score.success).length;
  return {r:last.r,last,done:done.length,hit,rate:done.length?100*hit/done.length:null,needsReview:xs.filter(x=>x.needsReview).length};
 }).sort((a,b)=>b.r.targetPeriod-a.r.targetPeriod);
}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function report(){
 const items=summary();if(!items.length)return '';
 const names={te:'特码',z3:'三中三',lx:'连肖',pt:'平特肖'};
 return '<section class="card" id="manual-constraint-report65"><div class="sec-title">📌 我选的条件 · 按期核对</div><p style="font-size:11px">三中三按6个正码中至少3码；三／四／五连肖按对应组数全中，超过5肖的范围按命中至少5肖统计。特码按特码，平特肖按7个开奖生肖。排除号码按0命中，排除组合按保存时的最大命中上限。相同条件、号码池和上限，每个目标期只算一次；保存早于录入不等于早于实际开奖。</p><div style="overflow-x:auto"><table><tr><th>玩法 / 条件</th><th>目标期结果</th><th>累计准确率</th><th>准／已核对</th></tr>'+items.map(x=>{
  const s=x.last.score,r=x.r,members=r.values||r.pool,count=members.length,unit=r.values?'条件':r.game==='z3'?'正码':r.game==='te'?'特码':'生肖',hits=s?unit+'命中 '+s.hits.length+(r.game==='te'?'':'/'+count):'';
  const limit=r.action==='exclude-combination'?' · 最多命中'+limitFor(r)+(r.game==='lx'?'肖':'项'):'';
  const state=x.last.needsReview?'待核对：'+x.last.reason:s?(s.success?'准':'错')+' · '+hits:'待录入开奖';
  const color=x.last.needsReview?'#a76c00':s?(s.success?'#178447':'#bf3333'):'#a76c00';
  return '<tr><td><b>'+esc(names[r.game]+' · '+r.label)+'</b>'+esc(limit)+'</td><td><b style="color:'+color+'">第'+r.targetPeriod+'期 '+esc(state)+'</b></td><td>'+(x.rate===null?'暂无':x.rate.toFixed(1)+'%')+'</td><td>'+x.hit+'/'+x.done+(x.needsReview?'（'+x.needsReview+'期待核对）':'')+'</td></tr>';
 }).join('')+'</table></div></section>';
}
const oldSave=root.saveData;root.saveData=function(){capture();return oldSave.apply(this,arguments);};
const oldRender=root.render;root.render=function(){
 const r=oldRender.apply(this,arguments);
 if(capture())oldSave.call(this);
 document.getElementById('manual-constraint-report65')?.remove();
 if(['te','tea','zm3','lx','plan','rev','rec'].includes(activeTab)){const box=document.getElementById('tabContent'),html=report();if(box&&html)box.insertAdjacentHTML('beforeend',html);}
 return r;
};
root.ManualConstraintTracker={capture,report,summary,evaluate};
if(typeof module!=='undefined')module.exports=root.ManualConstraintTracker;
})(typeof window==='undefined'?globalThis:window);
