(function(){
'use strict';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function payload(pool,game,label,action,context){return esc(JSON.stringify({pool:pool.slice(),game,label,action,...(context?{context}: {})}));}
function contextError(c){
 if(!c)return '';
 if(c.blockedReason)return c.blockedReason;
 if(c.lot!==CUR_LOT||Number(c.targetPeriod)!==Number(NEXT))return '彩种或目标期已变化，请重新读取后操作';
 if(typeof winCurOff==='function'&&winCurOff()>0)return '当前是历史回看，请回到当前预测期操作';
 if(!Number.isInteger(c.sourcePeriod)||c.sourcePeriod>Number(NEXT))return '来源期不正确，请重新读取';
 if(c.sourcePeriod<Number(NEXT)&&c.referenceMode!=='retrospective')return '旧期资料须标为本期人工参考后才能应用';
 if(c.sourcePeriod===Number(NEXT)){
  if(c.sourceSettled)return '本期开奖已更新，请先录入开奖并切到下一期';
  if(c.referenceMode==='retrospective')return '当前期不能冒充历史参考，请重新读取';
  if(c.observer)return '当前期该时点仅供核对，不能当作开奖前排除';
  if(c.validUntil&&Date.now()>=c.validUntil)return '当前期观察时间已结束，请录入开奖后再操作';
 }
 return '';
}
function buttons(pool,game,label,action='track',context=null){
 if(!pool.length)return '<p>当前集合为空，不自动补入号码或生肖。</p>';
 const disabled=contextError(context),attr=disabled?' disabled aria-disabled="true"':'';
 return '<span class="practical-actions" data-action-payload="'+payload(pool,game,label,action,context)+'">'+
  '<button data-practical="save" title="保存待开奖核对" aria-label="保存待开奖核对"'+attr+'>🗂</button> '+
  '<button data-practical="copy" title="仅复制文字" aria-label="仅复制文字"'+attr+'>📋</button> '+
  '<button data-practical="pick" title="选用到筛选池并记录" aria-label="选用到筛选池并记录"'+attr+'>✅</button> '+
  '<button data-practical="exclude" title="排除此集合（连肖为排除整组）" aria-label="排除此集合"'+attr+'>🚫</button>'+
  (game==='z3'?'<button data-practical="exclude-combination" title="排除复式：该范围最多中2个正码"'+attr+'>🚫复式</button>':'')+'</span>';
}
// Timeline controls share the existing handler and bind source plus target metadata.
function excludeButtons(pool,label,context){
 const reason=contextError(context)||(!pool?.length?'缺少完整同刻映射，暂不可排除':'');
 const disabled=reason?' disabled aria-disabled="true"':'',c=reason?{...context,blockedReason:reason}:context;
 const title=context.referenceMode==='retrospective'?'作为第'+context.targetPeriod+'期人工参考':'应用到第'+context.targetPeriod+'期';
 return '<div class="practical-exclude135"><div class="practical-target135">'+esc(title)+'</div>'+[['z3','排除正码'],['te','排除特码']].map(([game,text])=>'<span class="practical-actions" data-action-payload="'+payload(pool||[],game,label,'exclude',c)+'"><button class="practical-exclude-button135" data-practical="exclude"'+disabled+'>'+text+'</button></span>').join(' ')+(reason?'<div class="practical-reason135" role="status">'+esc(reason)+'</div>':'')+'</div>';
}
// A redraw can replace the whole betting page. Preserve open panels and nested grids too.
function viewKey(el,index){
 if(el.id)return 'id:'+el.id;if(el.getAttribute?.('data-scroll-key138'))return 'scroll:'+el.getAttribute('data-scroll-key138');if(el.getAttribute?.('data-bet-map-key138'))return 'map:'+el.getAttribute('data-bet-map-key138');
 const summary=el.querySelector?.('summary')?.textContent?.trim();if(!summary)return 'index:'+index;
 const owner=el.parentElement?.closest?.('[data-bet-map-key138],[data-scroll-key138],[id]'),scope=owner?.getAttribute?.('data-bet-map-key138')||owner?.getAttribute?.('data-scroll-key138')||owner?.id||'page',same=owner?.querySelectorAll?[...owner.querySelectorAll('details')].filter(d=>d.querySelector?.('summary')?.textContent?.trim()===summary):null,part=same?same.indexOf(el):index;
 return 'summary:'+scope+'|'+summary+'|'+part;
}
function captureView(target){
 const box=typeof document.getElementById==='function'?document.getElementById('tabContent'):null,query=selector=>box&&typeof box.querySelectorAll==='function'?[...box.querySelectorAll(selector)]:[];
 const details=query('details').map((el,i)=>({key:viewKey(el,i),open:!!el.open})),grids=query('[data-scroll-key138],.bet-grid134').map((el,i)=>({key:viewKey(el,i),x:el.scrollLeft||0,y:el.scrollTop||0}));
 let anchor=target?.closest?.('[data-bet-map-key138],[data-scroll-key138],[id]');
 if(!anchor||anchor===box){const eligible=query('[data-bet-map-key138],[id]').filter(el=>typeof el.getBoundingClientRect==='function').map(el=>({el,r:el.getBoundingClientRect()})).filter(x=>x.r.bottom>0);anchor=eligible.find(x=>x.r.top<=0)?.el||eligible[0]?.el;}
 const rect=anchor?.getBoundingClientRect?.();return {scope:box?.querySelector?.('[data-bet-scope138]')?.getAttribute?.('data-bet-scope138')||null,x:window.scrollX||0,y:window.scrollY||0,details,grids,anchor:anchor&&rect?{key:viewKey(anchor,0),top:rect.top}:null};
}
function restoreView(state){
 if(!state)return;const apply=()=>{const box=typeof document.getElementById==='function'?document.getElementById('tabContent'):null,query=selector=>box&&typeof box.querySelectorAll==='function'?[...box.querySelectorAll(selector)]:[];
  const scope=box?.querySelector?.('[data-bet-scope138]')?.getAttribute?.('data-bet-scope138')||null;if(state.scope&&state.scope!==scope)return;
  const details=new Map(state.details.map(x=>[x.key,x.open]));query('details').forEach((el,i)=>{const k=viewKey(el,i);if(details.has(k))el.open=details.get(k);});const grids=new Map(state.grids.map(x=>[x.key,x]));query('[data-scroll-key138],.bet-grid134').forEach((el,i)=>{const old=grids.get(viewKey(el,i));if(old){el.scrollLeft=old.x;el.scrollTop=old.y;}});
  const anchor=state.anchor&&query('[data-bet-map-key138],[data-scroll-key138],[id]').find((el,i)=>viewKey(el,i)===state.anchor.key),r=anchor?.getBoundingClientRect?.(),y=r?(window.scrollY||0)+r.top-state.anchor.top:state.y;
  if(typeof window.scrollTo==='function')window.scrollTo(state.x,Math.max(0,y));
 };if(typeof requestAnimationFrame==='function')requestAnimationFrame(apply);else apply();
}
function sourceFields(x){const c=x.context;if(!c)return {};return {sourcePeriod:c.sourcePeriod,sourceId:c.sourceId,slot:c.slot,sourceKind:c.kind,originDrawPeriod:c.originDrawPeriod,sourceMode:c.sourceMode,referenceMode:c.referenceMode,retrospective:c.referenceMode==='retrospective',manualReference:c.referenceMode==='retrospective'};}
document.addEventListener('click',function(e){
 const b=e.target.closest('[data-practical]');if(!b)return;
 let x;try{x=JSON.parse(b.closest('[data-action-payload]').dataset.actionPayload);}catch{return;}
 if(!x)return;
 const contextFailure=contextError(x.context);if(contextFailure){showClickFeedback(contextFailure);return;}
 const view=captureView(b),simulation=/随机实验/.test(x.label),redraw=()=>{render();restoreView(view);};
 const record=(extra={})=>({lot:CUR_LOT,targetPeriod:NEXT,sourcePeriod:DR.at(-1)?.p,game:x.game,arm:simulation?'simulation':/系统固定|系统独立/.test(x.label)?'fixed':'manual',label:x.label,retrospective:/事后核对/.test(x.label),action:x.action,pool:x.pool.slice(),savedAt:new Date().toISOString(),...extra,...sourceFields(x)});
 if(b.dataset.practical==='save'){
  if(typeof winCurOff==='function'&&winCurOff()>0){showClickFeedback('历史回看不保存为新预测');return;}
  UP.practical_actions=UP.practical_actions||[];UP.practical_actions.push(record({method:'save'}));saveData();redraw();showClickFeedback('✅ 已保存，录入目标期开奖后自动核对');return;
 }
 if(b.dataset.practical==='copy'){
  if(typeof winCurOff!=='function'||winCurOff()===0){UP.practical_actions=UP.practical_actions||[];UP.practical_actions.push(record({method:'copy'}));saveData();}
  navigator.clipboard.writeText(PredictionReview.format(CUR_LOT,x.game,x.pool,x.action)).then(()=>showClickFeedback('✅ 已复制 '+x.pool.length+'项')).catch(()=>showClickFeedback('❌ 复制失败，请手动复制'));return;
 }
 if(typeof winCurOff==='function'&&winCurOff()>0){alert('历史回看仅核对，请回到当前期应用。');return;}
 if(b.dataset.practical==='exclude-combination'||b.dataset.practical==='exclude'&&x.game==='lx'&&x.pool.length>1){
  const max=ComboLimits.save(UP,x.game,x.pool);UP.practical_actions=UP.practical_actions||[];UP.practical_actions.push(record({arm:'manual',label:x.label+' · 排除整组',action:'exclude-combination',maxHits:max}));saveData();redraw();showClickFeedback('已排除整组：最多包含其中'+max+'项，不逐个排除');return;
 }
 const exclude=b.dataset.practical==='exclude',key=x.game==='z2'?(exclude?'z2_excl_nums':'z2_pick_pool'):x.game==='pt'?(exclude?'pt_excl_zods':'pt_force_zods'):x.game==='lx'?(exclude?'lx_excl_zods':'lx_force_zods'):['z3','z3in2','normal'].includes(x.game)?(exclude?'zm3_excl_nums':'zm3_pick_pool'):(exclude?'te_excl_nums':'te_pick_pool');
 const old=(UP[key]||[]).slice();let ns=x.pool.slice();
 if(!exclude&&x.game!=='lx'&&x.game!=='pt'){
  const allowed=getPracticeContext()[x.game==='te'?'teAllowed':'z3Allowed'];if(!simulation)ns=ns.filter(allowed);if(!ns.length){alert('此集合与你的排除条件冲突，没有可选号码。');return;}
 }
 if(x.game==='lx'&&!exclude&&!ComboLimits.allowed(ns,UP.lx_grp_limits||[])){showClickFeedback('此组合不满足每组最少／最多限制');return;}
 if(x.game==='lx'||x.game==='pt'){
  const opposite=UP[x.game==='pt'?(exclude?'pt_force_zods':'pt_excl_zods'):(exclude?'lx_force_zods':'lx_excl_zods')]||[];
  if(ns.some(z=>opposite.includes(z))||exclude&&new Set(old.concat(ns)).size>=12){alert('与连肖已有条件冲突，或会排除全部生肖；请先调整条件。');return;}
 }
 UP.practical_actions=UP.practical_actions||[];UP.practical_actions.push(record({action:exclude?'exclude':'track',pool:ns,key,previous:old}));UP[key]=exclude||simulation?[...new Set(old.concat(ns))]:ns;saveData();redraw();showClickFeedback((exclude?'✅ 已排除 ':'✅ 已选用 ')+ns.length+'项（当前筛选已更新）');
});
function upload(){const box=document.getElementById('tabContent');if(!box||document.getElementById('direct-image-upload'))return;const el=document.createElement('div');el.id='direct-image-upload';el.innerHTML='<button type="button" id="visible-image-upload">📝 人工录入资料／网址交集</button><small> 核对彩种、期数、玩法后保存集合或应用。</small>';el.querySelector('button').onclick=()=>{activeTab='img';render();};box.prepend(el);}
window.PracticalActions={buttons,excludeButtons,captureView,restoreView};
document.addEventListener('DOMContentLoaded',()=>{const base=window.render;window.render=function(){const r=base.apply(this,arguments);upload();return r;};upload();});
})();
