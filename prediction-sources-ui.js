(function(){'use strict';
let cache=null,error='',chosen=new Set();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function candidates(e){const claim=SourceQuality.extract(e);if(!claim)return null;const pool=WebTextRules.pool(claim,n=>({生肖:gz(n),单双:gpar(n),大小:gsz(n),家野:gfam(n),波色:gwv(n),五行:gwx(n),合数单双:ghe(n)}));return pool.length?{...claim,pool}:null;}
function show(){
 if(activeTab!=='img'||!cache)return;
 const openSources=new Set(Array.from(document.querySelectorAll('#prediction-sources details[data-source-open][open]')).map(x=>x.dataset.sourceOpen));
 document.getElementById('prediction-sources')?.remove();
 const sets=[],sources=cache.sources.filter(s=>s.lot===CUR_LOT&&SourceSlots.sources.some(x=>x.url===s.url&&x.lot===s.lot));
 let h='<section id="prediction-sources" class="card"><h3>🌐 外部资料 · 当前预测第'+NEXT+'期</h3><button id="refresh-prediction-sources">↻ 刷新已采集资料</button><small> 读取已发布快照；期号一致才可应用。缺失不等于预测错误。</small>'+esc(error);
 sources.forEach(s=>{
  const matches=+s.period===+NEXT,entries=SourceGroups.compact(s.entries.map(e=>({...e,claim:candidates(e)}))),groups=new Map();
  entries.forEach(e=>{const label=e.claim?SourceGroups.group(e.claim):'待更新／待核对';if(!groups.has(label))groups.set(label,[]);groups.get(label).push(e);});
  h+='<details data-source-open="'+esc(s.url)+'" '+(openSources.has(s.url)?'open':'')+'><summary><b>'+esc(SourceSlots.sources.find(x=>x.url===s.url)?.id)+' · '+esc(s.name)+'</b> · 第'+s.period+'期 · '+entries.length+'条</summary><small>'+esc(s.capturedAt)+' · '+esc(s.status==='read'?'已读取':s.status==='stale'?'本次失败，保留旧快照':'读取失败')+'</small>';
  if(!matches)h+='<p style="color:#a35a00">与当前预测第'+NEXT+'期不同，仅供核对，不应用选号。</p>';
  if(s.errors?.length)h+='<details><summary>⚠ '+s.errors.length+'项未读到</summary>'+s.errors.map(e=>'<p>'+esc(e.url)+'：'+esc(e.error)+'</p>').join('')+'</details>';
  groups.forEach((rows,label)=>{
   h+='<details open><summary style="color:#17639c"><b>'+esc(label)+'</b> · '+rows.length+'</summary>';
   rows.forEach((e,i)=>{
    const c=e.claim,id=s.url+'|'+s.period+'|'+e.url+'|'+e.title+'|'+i;
    h+='<article style="border-top:1px solid #ddd;padding:5px;font-size:13px"><b>'+esc(e.title)+'</b> ';
    if(c){
     const value=c.kind==='生肖'?esc(c.values.join('、')):c.kind==='号码'?CandidateDisplay.summary(c.pool):esc(c.values.join('、')+(c.kind==='头数'?'头':c.kind==='尾数'?'尾':''));
     h+='<span style="color:'+(c.action==='exclude'?'#b42318':'#087f5b')+'">'+(c.action==='exclude'?'🚫 ':'')+value+'</span>';
     if(matches){h+=PracticalActions.buttons(c.pool,c.game,'网址 '+s.name+' 第'+s.period+'期 '+e.title,c.action);
      if(c.game==='te'){
       const pool=c.action==='exclude'?Array.from({length:49},(_,n)=>n+1).filter(n=>!c.pool.includes(n)):c.pool;
       const zs=c.kind==='生肖'?(c.action==='exclude'?'鼠牛虎兔龙蛇马羊猴鸡狗猪'.split('').filter(z=>!c.values.includes(z)):c.values):null;
       sets.push({id,pool,zs,label:s.name+' '+e.title});
       h+='<label><input type="checkbox" data-source-intersection="'+esc(id)+'" '+(chosen.has(id)?'checked':'')+'>交集'+(c.action==='exclude'?'（取剩余）':'')+'</label>';
      }
     }
    }else h+='<span style="color:#a35a00">'+esc(e.status==='pending'?'待更新':'数量／内容待核对，未应用')+'</span>';
    h+='<details><summary>原文 ↗</summary><p>'+esc(e.rawText)+'</p><a href="'+esc(e.url)+'" target="_blank" rel="noopener">来源正文</a></details></article>';
   });h+='</details>';
  });h+='</details>';
 });
 const selected=sets.filter(s=>chosen.has(s.id));
 h+='<div style="border-top:2px solid #17639c;padding:8px"><b>∩ 特码资料交集</b><small> 勾选上方属性；正码、连肖、平特不会混入。杀项按剩余集合求交。</small>';
 const zodiacSets=selected.filter(s=>s.zs);if(zodiacSets.length){const counts='鼠牛虎兔龙蛇马羊猴鸡狗猪'.split('').map(z=>({z,n:zodiacSets.filter(s=>s.zs.includes(z)).length})).filter(x=>x.n).sort((a,b)=>b.n-a.n);h+='<p style="color:#17639c">已选生肖组覆盖次数：'+counts.map(x=>esc(x.z)+' '+x.n+'/'+zodiacSets.length).join(' · ')+'<small>（不是命中率）</small></p>';}
 if(selected.length>=2){const pool=selected.reduce((a,s)=>a.filter(n=>s.pool.includes(n)),selected[0].pool);h+='<p>'+selected.length+'项 → '+CandidateDisplay.summary(pool)+PracticalActions.buttons(pool,'te','外部资料交集 第'+NEXT+'期')+'</p>';
  if(selected.every(s=>s.zs)){const zs=selected.reduce((a,s)=>a.filter(z=>s.zs.includes(z)),selected[0].zs);h+='<p style="color:#087f5b">生肖交集：'+esc(zs.join('、')||'空集')+'</p>';}
 }else h+='<p>已选择'+selected.length+'项，请至少选2项。</p>';
 h+='</div></section>';document.getElementById('tabContent')?.insertAdjacentHTML('afterbegin',h);
}
async function load(){try{const r=await fetch('prediction-source-cache.json?ts='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);cache=await r.json();error='';show();}catch(e){error='资料读取失败 '+e.message;}}
document.addEventListener('click',e=>{if(e.target.id==='refresh-prediction-sources')load();});
document.addEventListener('change',e=>{if(e.target.matches('[data-source-intersection]')){const y=window.scrollY,id=e.target.dataset.sourceIntersection;e.target.checked?chosen.add(id):chosen.delete(id);show();requestAnimationFrame(()=>window.scrollTo(0,y));}});
const base=window.render;window.render=function(){const r=base.apply(this,arguments);show();return r;};window.PredictionSources={candidates};load();
})();
