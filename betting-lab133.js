(function(root){
'use strict';
const balls=Array.from({length:49},(_,i)=>i+1),animals=[...'鼠牛虎兔龙蛇马羊猴鸡狗猪'];
const names=s=>(s?.zodiacs||[]).map(v=>typeof v==='string'?v:v.z),numbers=s=>(s?.numbers||[]).map(v=>typeof v==='number'?v:v.n),unique=a=>[...new Set(a)];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const same=(a,b)=>a&&b&&a.date===b.date&&a.draw.t===b.draw.t&&a.draw.n.slice().sort((a,b)=>a-b).join()===b.draw.n.slice().sort((a,b)=>a-b).join();
function choose(n,k){if(k<0||k>n)return 0;let r=1;for(let i=1;i<=k;i++)r=r*(n-i+1)/i;return r;}
function coverage(size){let p=0;for(let k=3;k<=6;k++)p+=choose(size,k)*choose(49-size,6-k)/choose(49,6);return p;}
function valid(s){return numbers(s).length===49&&new Set(numbers(s)).size===49&&numbers(s).every(n=>balls.includes(n))&&names(s).length===12&&new Set(names(s)).size===12&&names(s).every(z=>animals.includes(z));}
function mapsFor(a,b,slot){return [a,b].map(d=>new Map((d.reports.find(r=>r.slot===slot)?.report.items||[]).filter(r=>valid(r.snapshot)).map(r=>[Number(r.issue),r])));}
function snapshot(d,target,slot,expectedDay,now=Date.now()){const p=d.periods?.find(p=>+p.period===target),s=p?.timeSlots?.[slot],delay=Date.parse(s?.collectedAt)-Date.parse(s?.scheduledAt);return s&&valid(s)&&!p.result&&!s.resultSeenAtCollection&&slot<'21:30'&&s.scheduledAt?.slice(11,16)===slot&&(!expectedDay||s.scheduledAt.slice(5,10)===expectedDay)&&Number.isFinite(delay)&&delay>=0&&delay<=60000&&Date.parse(s.collectedAt)<=now&&new Date(Date.parse(s.collectedAt)+28800000).toISOString().slice(0,10)===s.scheduledAt.slice(0,10)?s:null;}
const strategies=[
 {id:'Ah10',label:'A站热前10码',source:'A',take:0}, {id:'Bh10',label:'B站热前10码',source:'B',take:0},
 {id:'Ac10',label:'A站冷后10码',source:'A',take:-10}, {id:'Bc10',label:'B站冷后10码',source:'B',take:-10},
 {id:'hotAnd',label:'两站热前10交集',take:0,join:'and'}, {id:'hotOr',label:'两站热前10并集',take:0,join:'or'},
 {id:'coldAnd',label:'两站冷后10交集',take:-10,join:'and'}, {id:'coldOr',label:'两站冷后10并集',take:-10,join:'or'},
 {id:'Amapped',label:'A站上期七码名次迁移',source:'A',mapped:true}, {id:'Bmapped',label:'B站上期七码名次迁移',source:'B',mapped:true}
];
function range(strategy,sa,sb,pa,pb){
 const take=(s,previous)=>{if(!valid(s))return null;const list=numbers(s);if(strategy.mapped){if(!previous||!valid(previous.snapshot))return null;const old=numbers(previous.snapshot);return previous.draw.n.concat(previous.draw.t).map(n=>list[old.indexOf(n)]); }return strategy.take===0?list.slice(0,10):list.slice(-10);};
 const x=take(sa,pa),y=take(sb,pb);return strategy.source==='A'?x:strategy.source==='B'?y:!x||!y?null:strategy.join==='and'?x.filter(n=>y.includes(n)):unique(x.concat(y));
}
function tally(tests){const n=tests.length,hist=Array(7).fill(0);for(const t of tests)hist[t.hits]++;return {n,h:hist.slice(3).reduce((a,b)=>a+b,0),hist,meanSize:n?tests.reduce((a,t)=>a+t.pool.length,0)/n:0,baseline:n?tests.reduce((a,t)=>a+coverage(t.pool.length),0)/n:0};}
function numberStudy(a,b,slot,target,expectedDay){
 const [A,B]=mapsFor(a,b,slot),issues=unique([...A.keys(),...B.keys()]).sort((a,b)=>a-b),sa=snapshot(a,target,slot,expectedDay),sb=snapshot(b,target,slot,expectedDay);
 return strategies.map(strategy=>{
  const tests=[];let missing=0,empty=0,conflicts=0;
  for(const issue of issues){if(issue>=2026000+target)continue;const x=A.get(issue),y=B.get(issue);if(x&&y&&!same(x,y)){conflicts++;continue;}const pool=range(strategy,x?.snapshot,y?.snapshot,A.get(issue-1),B.get(issue-1)),draw=(strategy.source==='B'?y:x)?.draw;if(!pool||!draw){missing++;continue;}if(pool.length<3){empty++;continue;}tests.push({issue,pool,hits:draw.n.filter(n=>pool.includes(n)).length});}
  const cut=Math.floor(tests.length*.7);return {...strategy,...tally(tests),tests,training:tally(tests.slice(0,cut)),check:tally(tests.slice(cut)),missing,empty,conflicts,current:range(strategy,sa,sb,A.get(2026000+target-1),B.get(2026000+target-1))};
 });
}
function overlapStudy(data,slot,zod,beforeIssue=Infinity){
 const map=new Map((data.reports.find(r=>r.slot===slot)?.report.items||[]).filter(r=>valid(r.snapshot)).map(r=>[Number(r.issue),r])),tests=[],hist=Array(8).fill(0);
 for(const [issue,row] of map){const prev=map.get(issue-1);if(issue>=beforeIssue||!prev||prev.date<'2026-02-17'||row.date<'2026-02-17')continue;const ranks=unique(prev.draw.n.concat(prev.draw.t).map(n=>names(prev.snapshot).indexOf(zod(n)))),pool=ranks.map(i=>names(row.snapshot)[i]),seven=new Set(row.draw.n.concat(row.draw.t).map(zod)),normal=new Set(row.draw.n.map(zod)),hits=pool.filter(z=>seven.has(z)).length;hist[hits]++;tests.push({issue,pool,ranks:ranks.map(i=>i+1),hits,normal:pool.filter(z=>normal.has(z)).length,full:hits===pool.length});}
 return {n:tests.length,hist,max:tests.length?Math.max(...tests.map(t=>t.hits)):null,full:tests.filter(t=>t.full).length,tests};
}
function rankMoves(a,b,early,late,zod,beforeIssue=Infinity){return [a,b].flatMap((data,source)=>['zodiac','flat'].map(kind=>{
 const get=s=>kind==='flat'?(s?.flatZodiacs||[]).map(x=>typeof x==='string'?x:x.z):names(s),before=new Map((data.reports.find(r=>r.slot===early)?.report.items||[]).map(r=>[Number(r.issue),r]));
 const groups=['下降','不变','上升'].map(label=>({label,n:0,normal:0,special:0,seven:0,base6:0,base7:0}));let periods=0;
 for(const row of data.reports.find(r=>r.slot===late)?.report.items||[]){const prev=before.get(Number(row.issue));if(Number(row.issue)>=beforeIssue||!prev||!same(row,prev)||prev.date!==row.date||row.date<'2026-02-17')continue;const x=get(prev.snapshot),y=get(row.snapshot);if(x.length!==12||y.length!==12||new Set(x).size!==12||new Set(y).size!==12||!x.concat(y).every(z=>animals.includes(z)))continue;periods++;const normal=new Set(row.draw.n.map(zod)),te=zod(row.draw.t);
  for(const z of animals){const from=x.indexOf(z),to=y.indexOf(z),g=groups[to>from?0:to===from?1:2],size=balls.filter(n=>zod(n)===z).length;g.n++;g.normal+=normal.has(z);g.special+=te===z;g.seven+=normal.has(z)||te===z;g.base6+=1-choose(49-size,6)/choose(49,6);g.base7+=1-choose(49-size,7)/choose(49,7);}
 }
 return {source:['A','B'][source],kind,periods,groups};
}));}
function priorityPoints(pref,lot,target,n,blocked,now=Date.now()){return !blocked&&pref?.lot===lot&&pref.period===target&&pref.validUntil>now&&pref.pool?.includes(n)?3:0;}
function prefer(list,pref,lot,target,now=Date.now()){return pref?.lot===lot&&pref.period===target&&pref.validUntil>now?list.filter(n=>pref.pool.includes(n)).concat(list.filter(n=>!pref.pool.includes(n))):list;}
function anchorProfile(rows,zod,wx){
 const clean=rows.filter(r=>r.n?.length===6&&unique(r.n.concat(r.t)).length===7&&r.n.concat(r.t).every(n=>balls.includes(n))).slice().sort((a,b)=>a.p-b.p),last=clean.at(-1),seen=new Set(last?last.n.concat(last.t).map(n=>wx(zod(n))):[]);
 return animals.map(z=>{let gap=0;for(let i=clean.length-1;i>=0&&!clean[i].n.concat(clean[i].t).some(n=>zod(n)===z);i--)gap++;return {z,wx:wx(z),n:clean.length,normal:clean.filter(r=>r.n.some(n=>zod(n)===z)).length,seven:clean.filter(r=>r.n.concat(r.t).some(n=>zod(n)===z)).length,gap,elementMissing:!!last&&!seen.has(wx(z))};}).sort((a,b)=>b.gap-a.gap);
}
function currentDrops(data,target,early,late,expectedDay,kind){
 const a=snapshot(data,target,early,expectedDay),b=snapshot(data,target,late,expectedDay),get=s=>kind==='flat'?(s?.flatZodiacs||[]).map(x=>typeof x==='string'?x:x.z):names(s),x=get(a),y=get(b);
 if(!a||!b||x.length!==12||y.length!==12||new Set(x).size!==12||new Set(y).size!==12||!x.concat(y).every(z=>animals.includes(z)))return null;
 return animals.filter(z=>y.indexOf(z)>x.indexOf(z)).map(z=>({z,from:x.indexOf(z)+1,to:y.indexOf(z)+1}));
}
const rate=(h,n)=>n?h+'/'+n+'（'+(100*h/n).toFixed(1)+'%）':'暂无样本',pct=n=>(100*n).toFixed(1)+'%',codes=pool=>pool?.length?pool.map(n=>typeof n==='number'?String(n).padStart(2,'0'):n).join('、'):'暂无当前候选';
function table(heads,rows){return '<div style="overflow:auto"><table style="min-width:620px;width:100%;font-size:12px"><tr>'+heads.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr>'+rows.map(row=>'<tr>'+row.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</table></div>';}
const contexts=new Map();
function view(a,b,lot,target,slot){
 const day=typeof pToDate==='function'?pToDate(target).replace('/','-'):null,key=lot+'|'+target+'|'+slot,rows=numberStudy(a,b,slot,target,day),ov=[a,b].map(d=>overlapStudy(d,slot,gz,2026000+target)),earlier={'19:30':'19:00','20:00':'19:30','20:30':'20:00','21:00':'20:30','21:30':'21:00','21:35':'21:30'}[slot]||'20:30',moves=slot>earlier?rankMoves(a,b,earlier,slot,gz,2026000+target):[],current=[snapshot(a,target,slot,day),snapshot(b,target,slot,day)];contexts.set(key,{lot,target,slot,rows,current,a,b});if(contexts.size>8)contexts.delete(contexts.keys().next().value);
 const best=rows.filter(r=>r.n>=12&&r.check.n>=5&&r.training.h/r.training.n>r.training.baseline&&r.check.h/r.check.n>r.check.baseline).sort((x,y)=>(y.check.h/y.check.n-y.check.baseline)-(x.check.h/x.check.n-x.check.baseline))[0];
 const heading='<section class="card" data-lab-section133 style="border:1px solid #84afc9"><h3>大数据筛选依据 · '+(lot==='xa'?'新澳':'港彩')+' '+slot+'</h3><label>比较时点 <select data-lab-slot133 data-lab133="'+esc(key)+'">'+['19:00','19:30','20:00','20:30','21:00','21:30','21:35'].map(t=>'<option'+(slot===t?' selected':'')+'>'+t+'</option>').join('')+'</select></label><p>'+ (best?'可继续观察「'+best.label+'」，前后段均高于同宽基准，仍属多策略探索。':'目前没有范围同时达到12期、后段5期且前后段均优于随机的观察门槛。下面仍列候选供你手动比较。')+'</p>';
 const number=table(['固定范围','历史≥3正码','平均码数／随机基准','后30%≥3正码','本期经你的筛选后候选','操作'],rows.map(r=>{let allowed=[];try{allowed=(r.current||[]).filter(getPracticeContext().z3Allowed);}catch{}return ['<b>'+r.label+'</b>',rate(r.h,r.n)+'<br>少于3个 '+(r.n-r.h)+'期',r.meanSize.toFixed(1)+'码 / '+pct(r.baseline),rate(r.check.h,r.check.n),'<span style="color:#111">'+codes(allowed)+'</span>',allowed.length>=3?'<button data-priority133="'+r.id+'" data-lab133="'+esc(key)+'">作为正码软优先</button>':'待有效榜单／可选不足3码'];}));
 const overlap='<h4>上期生肖排名映射后，实际最多重复几个？</h4>'+table(['来源','有效连续期','七球重合最大值','映射池全部出现','重合0—7肖的期数'],ov.map((r,i)=>[['A','B'][i],r.n,r.max??'—',rate(r.full,r.n),r.hist.map((n,k)=>k+'肖 '+n+'期').join(' · ')]))+'<p>这里按不同生肖去重，顺序不要求一致。样本最大重合数只是已观察结果，不等于未来上限。</p>'+ov.map((r,i)=>'<details><summary>'+['A','B'][i]+'站 · 逐期重合明细（'+r.n+'期）</summary>'+table(['期数','沿用上期名次','本期映射生肖','正码重合／七球重合','是否全出现'],r.tests.map(t=>[t.issue,t.ranks.join('、'),codes(t.pool),t.normal+' / '+t.hits,t.full?'全部出现':'未全出现']))+'</details>').join('');
 const drops=slot>earlier?[a,b].map((d,i)=>['zodiac','flat'].map(kind=>{const zs=currentDrops(d,target,earlier,slot,day,kind);return '<p><b>'+['A','B'][i]+'站 '+(kind==='flat'?'独立平特':'生肖汇总')+' 本期下降：</b>'+(!zs?'缺少同日配对榜单':zs.length?zs.map(v=>v.z+' '+v.from+'→'+v.to).join('；'):'没有下降生肖')+'</p>';} ).join('')).join(''):'';
 const conclusions=moves.map(m=>{const g=m.groups[0];return '<p>'+m.source+'站 '+(m.kind==='flat'?'独立平特':'生肖汇总')+'：'+(!m.periods?'无完整配对，暂不能判断。':!g.n?'所留时点未观察到排名下降，不能验证该假设。':'下降生肖正特任一开出 '+rate(g.seven,g.n)+'，与同宽基准相差 '+(100*(g.seven-g.base7)/g.n).toFixed(1)+' 个百分点；只有'+m.periods+'个配对期，暂不据此自动加分或排除。')+'</p>';}).join('');
 const movement='<h4>'+earlier+' → '+slot+' 排名下降验证</h4>'+drops+conclusions+table(['来源／榜单','配对期数','变化','正码生肖／基准','特肖出现','正特任一／基准'],moves.flatMap(m=>m.groups.map(g=>[m.source+' '+(m.kind==='flat'?'独立平特':'生肖汇总'),m.periods,g.label,rate(g.normal,g.n)+' / '+(g.n?pct(g.base6/g.n):'—'),rate(g.special,g.n),rate(g.seven,g.n)+' / '+(g.n?pct(g.base7/g.n):'—')])))+'<p>下降指名次数值变大，例如第1→第4。每个生肖每期最多计1次，不能把生肖×期当作独立期数；下降不预设为必出。</p>';
 let profile='';try{const clean=typeof planClean==='function'?planClean(DR).rows:DR,ps=anchorProfile(clean,gz,zodWx);profile='<details><summary>固定肖前先看：遗漏、正码／七球频率与缺席五行</summary><p>下面是历史描述，不把遗漏长、缺席五行或日历属性直接视为下期必出。</p>'+table(['生肖／五行','连续未见期数','正码出现期／总期','七球出现期／总期','上期七球五行'],ps.map(p=>[p.z+'／'+p.wx,p.gap,rate(p.normal,p.n),rate(p.seven,p.n),p.elementMissing?'所属五行缺席':'所属五行已见']))+'</details>';}catch{}
 const linked='<h4>连肖条件 · 自己决定是否开启</h4><p>当前固定肖：'+esc((UP.lx_force_zods||[]).join('、')||'未指定')+'。固定肖会影响每一组，请先核对平肖／七球统计。</p><label>配组固定肖 <select data-anchor133><option value="">不增加固定肖</option>'+animals.map(z=>'<option value="'+z+'">'+z+'</option>').join('')+'</select></label> <button data-lx133="anchor" data-lab133="'+esc(key)+'">加入选定固定肖</button>'+current.map((s,i)=>s?'<div style="padding:6px"><b>'+['A','B'][i]+'站</b> 热前5【'+names(s).slice(0,5).join('、')+'】；冷后5【'+names(s).slice(-5).join('、')+'】 <button data-lx133="hot" data-lab133="'+esc(key)+'" data-source133="'+i+'">热前5至少取1肖</button> <button data-lx133="cold" data-lab133="'+esc(key)+'" data-source133="'+i+'">冷后5至少取1肖</button></div>':'<p>'+['A','B'][i]+'站缺本期'+slot+'有效榜单，暂不能设置名次组。</p>').join('')+'<p>上面条件均为可选，不会自动设定。你的必选、排除、禁配和组上限继续生效；若组合为空，应先检查条件冲突。</p>';
 const audit='<details><summary>三中三逐期覆盖与缺失情况</summary>'+rows.map(r=>'<details><summary>'+r.label+' · '+r.n+'期；缺配对 '+r.missing+'，范围不足3码 '+r.empty+'，来源冲突 '+r.conflicts+'</summary>'+table(['期数','当期范围','范围内正码个数'],r.tests.map(t=>[t.issue,codes(t.pool),t.hits+(t.hits>=3?'（≥3）':'（不足3）')]))+'</details>').join('')+'</details>';
 return heading+(slot>='21:30'?'<p style="color:#a32">当前是开奖附近观察时点，含赛果已知风险，仅作事后核对，不提供本期优先或连肖名次组。</p>':'')+'<h4>三中三范围覆盖比较</h4><p>只核对六个正码。范围含≥3个不等于一注三中三全中；不把49码这种天然覆盖作为策略。表中历史成绩在应用当前人工筛选前计算，本期候选则已过滤你的条件。</p>'+number+audit+overlap+movement+profile+linked+'</section>';
}
function sourceState(ctx){return ctx&&CUR_LOT===ctx.lot&&NEXT===ctx.target&&(!winCurOff||winCurOff()===0);}
function journal(ctx,label,pool,game,action){UP.practical_actions=UP.practical_actions||[];UP.practical_actions.push({lot:ctx.lot,targetPeriod:ctx.target,sourcePeriod:ctx.target-1,game,label,pool:pool.slice(),action,slot:ctx.slot,savedAt:new Date().toISOString()});}
if(typeof document!=='undefined'){
 document.addEventListener('change',e=>{if(!e.target.matches('[data-lab-slot133]'))return;const ctx=contexts.get(e.target.dataset.lab133);if(!sourceState(ctx)){showClickFeedback('请重新读取当前预测期资料');return;}e.target.closest('[data-lab-section133]').outerHTML=view(ctx.a,ctx.b,ctx.lot,ctx.target,e.target.value);});
 document.addEventListener('click',e=>{
  const p=e.target.closest('[data-priority133]'),lx=e.target.closest('[data-lx133]');if(!p&&!lx)return;const button=p||lx,ctx=contexts.get(button.dataset.lab133);if(!sourceState(ctx)){showClickFeedback('请重新读取当前预测期资料');return;}
  if(p){const row=ctx.rows.find(r=>r.id===p.dataset.priority133),pool=(row?.current||[]).filter(getPracticeContext().z3Allowed);if(pool.length<3){showClickFeedback('保留你的筛选后不足3码，未改变设置');return;}const stamp=ctx.current.find(Boolean)?.scheduledAt?.slice(0,10);if(!stamp||Date.parse(stamp+'T21:30:00+08:00')<=Date.now()){showClickFeedback('缺少本期有效采集时间');return;}UP.zm3_betting_priority133={lot:ctx.lot,period:ctx.target,slot:ctx.slot,pool,label:row.label,validUntil:Date.parse(stamp+'T21:30:00+08:00')};journal(ctx,'大数据软优先·'+row.label,pool,'z3','priority');saveData();render();showClickFeedback('已加入正码软优先+3分，未覆盖你的指定、排除或组合条件');return;}
  if(lx.dataset.lx133==='anchor'){const z=lx.closest('section').querySelector('[data-anchor133]').value;if(!z){showClickFeedback('请先选择固定肖');return;}if((UP.lx_excl_zods||[]).concat(UP.lx_ban_zods||[]).includes(z)){showClickFeedback('该肖已排除，未修改条件');return;}const next=unique((UP.lx_force_zods||[]).concat(z));if(next.length>5){showClickFeedback('固定肖超过五连肖长度，请先调整');return;}UP.lx_force_zods=next;journal(ctx,'连肖固定肖',[z],'lx','anchor');}
  else{const s=ctx.current[Number(lx.dataset.source133)];if(!s){showClickFeedback('缺少本期有效榜单');return;}const group=lx.dataset.lx133==='hot'?names(s).slice(0,5):names(s).slice(-5);if(!group.some(z=>!(UP.lx_excl_zods||[]).concat(UP.lx_ban_zods||[]).includes(z))){showClickFeedback('整组已被排除，未加入矛盾条件');return;}const rule={zods:group,min:1,max:5};UP.lx_grp_limits=UP.lx_grp_limits||[];if(!UP.lx_grp_limits.some(r=>JSON.stringify(r)===JSON.stringify(rule)))UP.lx_grp_limits.push(rule);journal(ctx,'榜单'+(lx.dataset.lx133==='hot'?'热前5':'冷后5')+'至少1肖',group,'lx','group-min1');}
  saveData();render();showClickFeedback('已加入可选连肖条件，组合生成继续检查全部限制');
 });
 document.addEventListener('click',e=>{if(!e.target.closest('[data-clear-priority133]'))return;delete UP.zm3_betting_priority133;saveData();render();showClickFeedback('已取消大数据软优先');});
}
function panel(game){const p=typeof UP==='undefined'?null:UP.zm3_betting_priority133,active=p&&p.lot===CUR_LOT&&p.period===NEXT&&p.validUntil>Date.now();return '<section class="card" id="betting-direct133"><h3>大数据'+(game==='lx'?'连肖条件与验证':'三中三范围优先')+'</h3><p>'+ (active?'正码软优先已启用【'+codes(p.pool)+'】 <button data-clear-priority133>取消软优先</button>':'未启用正码软优先。读取后可选择范围，已有指定和排除条件优先。')+'</p><button data-load133>读取两站依据与候选</button><div data-direct-result133></div></section>';}
if(typeof document!=='undefined'){
 document.addEventListener('DOMContentLoaded',()=>{const base=window.render;window.render=function(){const result=base.apply(this,arguments);if(['lx','zm3'].includes(activeTab)&&!document.getElementById('betting-direct133'))document.getElementById('tabContent')?.insertAdjacentHTML('afterbegin',panel(activeTab));return result;};});
 document.addEventListener('click',async e=>{const btn=e.target.closest('[data-load133]');if(!btn)return;const lot=CUR_LOT,target=NEXT,tab=activeTab,out=btn.parentElement.querySelector('[data-direct-result133]');if(!['xa','gc'].includes(lot)||winCurOff()>0){out.textContent='当前仅新澳、港彩提供两站榜单，请回到当前预测期。';return;}btn.disabled=true;out.textContent='正在读取两站留存…';try{const r=await Promise.allSettled(['A','B'].map(source=>BettingData71.study125(lot,source,DR.slice(),target)));if(!out.isConnected||lot!==CUR_LOT||target!==NEXT||tab!==activeTab)return;const data=r.map(x=>x.status==='fulfilled'?x.value:{periods:[],reports:BettingSlots82.reports([],[],gz,BettingAnalysis71)}),slot=UP.te_betting_analysis88==='slot2030'?'20:30':'21:00';out.innerHTML=(r.some(x=>x.status==='rejected')?'<p>部分来源读取失败，缺失资料不补造。</p>':'')+view(...data,lot,target,slot);}catch{out.textContent='本次未能完成，请稍后重试。';}finally{btn.disabled=false;}});
}
root.BettingLab133={numberStudy,overlapStudy,rankMoves,coverage,tally,priorityPoints,prefer,view,snapshot,range,panel,anchorProfile,currentDrops};if(typeof module!=='undefined')module.exports=root.BettingLab133;
})(typeof window==='undefined'?globalThis:window);
