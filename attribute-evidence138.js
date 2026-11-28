(function(root){
'use strict';
// Predeclared exclusion observations. No fitted weights and no automatic hard exclusion.
const balls=Array.from({length:49},(_,i)=>i+1),animals=[...'鼠牛虎兔龙蛇马羊猴鸡狗猪'];
const slots=['19:00','19:30','20:00','20:30','21:00','21:30','21:35'];
const keys={tail:'尾数',sum:'具体合数',element:'五行',zodiac:'生肖'},spans={head3:'前3名',head5:'前5名',tail3:'后3名',tail5:'后5名'};
const modes={numbers:'按前／后3或5个号码的属性',distinct:'按号码榜首次出现顺序取3或5种属性'};
const unique=a=>[...new Set(a)],esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),fmt=n=>String(n).padStart(2,'0');
const pct=x=>x===null||!Number.isFinite(x)?'—':(x*100).toFixed(1)+'%',rate=(h,n)=>n?h+'/'+n+'（'+pct(h/n)+'）':'无样本';
function choose(n,k){if(k<0||k>n)return 0;let p=1;for(let i=0;i<k;i++)p=p*(n-i)/(i+1);return p;}
function normalizedDay(d){if(!d)return null;const s=String(d);return /^2026-\d\d-\d\d/.test(s)?s.slice(0,10):/^\d{1,2}\/\d{1,2}$/.test(s)?'2026-'+s.split('/').map(v=>v.padStart(2,'0')).join('-'):null;}
function drawValid(d){return Array.isArray(d?.n)&&d.n.length===6&&new Set(d.n.concat(d.t)).size===7&&d.n.concat(d.t).every(n=>Number.isInteger(n)&&balls.includes(n));}
function sameDraw(a,b){return a.t===b.t&&a.n.slice().sort((x,y)=>x-y).join()===b.n.slice().sort((x,y)=>x-y).join()&&(!normalizedDay(a.date||a.d)||!normalizedDay(b.date||b.d)||normalizedDay(a.date||a.d)===normalizedDay(b.date||b.d));}
function numbers(s){return Array.isArray(s?.numbers)?s.numbers.map(v=>typeof v==='number'?v:v?.n):[];}
function snapshot(p,slot,date,now=Date.now(),observer=false){
 const s=p?.timeSlots?.[slot],ns=numbers(s);if(!s)return {value:null,reason:'未采到该时点'};
 if(ns.length!==49||new Set(ns).size!==49||!ns.every(n=>Number.isInteger(n)&&balls.includes(n)))return {value:null,reason:'49码排名不完整'};
 if(typeof s.scheduledAt!=='string'||typeof s.collectedAt!=='string')return {value:null,reason:'采集时间无效'};
 const scheduled=Date.parse(s.scheduledAt),collected=Date.parse(s.collectedAt),delay=collected-scheduled;
 if(!Number.isFinite(delay)||delay<0||delay>60000||s.scheduledAt.slice(11,16)!==slot)return {value:null,reason:'非有效准点采集'};
 if(!date||s.scheduledAt.slice(0,10)!==date||new Date(collected+28800000).toISOString().slice(0,10)!==date)return {value:null,reason:'采集日期与开奖日期不符'};
 if(collected>now)return {value:null,reason:'采集时间在未来'};
 if(!observer&&s.resultSeenAtCollection)return {value:null,reason:'采集时已见结果'};
 return {value:s,reason:null};
}
function attributeFns(options={}){const a=options.attrs||{};return {tail:n=>n%10,sum:n=>Math.floor(n/10)+n%10,element:a.element||a['五行'],zodiac:a.zodiac||a['生肖']||options.zod};}
function valuesValid(key,values){return values.length===49&&values.every(v=>key==='tail'?Number.isInteger(v)&&v>=0&&v<=9:key==='sum'?Number.isInteger(v)&&v>=1&&v<=13:key==='element'?['金','木','水','火','土'].includes(v):animals.includes(v));}
function candidate(s,key,span='head3',mode='numbers',attrs={}){
 if(!keys[key]||!spans[span]||!modes[mode])return null;
 const ns=numbers(s),fn=attributeFns({attrs})[key];if(ns.length!==49||new Set(ns).size!==49||!ns.every(n=>balls.includes(n))||typeof fn!=='function')return null;
 let all;try{all=balls.map(fn);}catch{return null;}if(!valuesValid(key,all))return null;
 const limit=span.endsWith('5')?5:3,ranked=span.startsWith('tail')?ns.slice().reverse():ns.slice(),seeds=[];
 if(mode==='numbers')seeds.push(...ranked.slice(0,limit));else{const seen=new Set();for(const n of ranked){const v=all[n-1];if(!seen.has(v)){seen.add(v);seeds.push(n);}if(seeds.length===limit)break;}}
 const values=unique(seeds.map(n=>all[n-1])),pool=balls.filter(n=>values.includes(all[n-1]));
 return {key,span,mode,values,pool,seeds:seeds.map(n=>({n,rank:ns.indexOf(n)+1,value:all[n-1]})),full:pool.length===49,requested:limit};
}
function evaluate(pool,draw){
 const hit=draw.n.filter(n=>pool.includes(n)),size=pool.length,base=[];
 for(let k=0;k<=6;k++)base.push(choose(size,k)*choose(49-size,6-k)/choose(49,6));
 return {normalHits:hit,normal:hit.length,special:pool.includes(draw.t),size,baseZero:base[0],baseNormal:6*size/49,baseSpecial:1-size/49,baseDistribution:base};
}
function summarize(tests){
 const n=tests.length,distribution=Array.from({length:7},(_,k)=>tests.filter(t=>t.normal===k).length),normalZero=distribution[0],specialFalse=tests.filter(t=>t.special).length;
 const mean=fn=>n?tests.reduce((s,t)=>s+fn(t),0)/n:null;
 return {n,normalZero,normalAny:n-normalZero,normalZeroRate:n?normalZero/n:null,normalDistribution:distribution,meanNormal:mean(t=>t.normal),specialFalse,specialSafe:n-specialFalse,specialFalseRate:n?specialFalse/n:null,specialSafeRate:n?(n-specialFalse)/n:null,meanSize:mean(t=>t.size),baselineZero:mean(t=>t.baseZero),baselineNormal:mean(t=>t.baseNormal),baselineSpecial:mean(t=>t.baseSpecial),baselineDistribution:Array.from({length:7},(_,k)=>mean(t=>t.baseDistribution[k])),issues:tests.map(t=>t.issue)};
}
function separate(tests){const cut=Math.floor(tests.length*.7);return {...summarize(tests),training:summarize(tests.slice(0,cut)),check:summarize(tests.slice(cut)),tests};}
function canonical(periods,slot,manual=[]){
 const by=new Map(),bad=new Set(),local=new Map(),localBad=new Set();let duplicateRows=0,invalidRows=0;
 for(const d of manual){const p=Number(d?.p);if(!Number.isInteger(p))continue;if(!drawValid(d)||local.has(p)&&!sameDraw(local.get(p),d))localBad.add(p);else if(!local.has(p))local.set(p,d);}
 for(const p of Array.isArray(periods)?periods:[]){const issue=Number(p?.issue),period=Number(p?.period);if(!Number.isInteger(issue)||issue!==2026000+period||period<1||period>366){invalidRows++;continue;}
  const old=by.get(issue);if(old){duplicateRows++;if(!!old.result!==!!p.result||old.result&&p.result&&(!drawValid(old.result)||!drawValid(p.result)||!sameDraw(old.result,p.result))||JSON.stringify(numbers(old.timeSlots?.[slot]))!==JSON.stringify(numbers(p.timeSlots?.[slot])))bad.add(issue);}
  else by.set(issue,{...p,issue,period});
 }
 for(const [issue,p] of by){if(localBad.has(p.period)||p.result&&!drawValid(p.result)||local.has(p.period)&&p.result&&!sameDraw(local.get(p.period),p.result))bad.add(issue);}
 return {by,local,bad,duplicateRows,invalidRows};
}
function study(data,options={}){
 const lot=options.lot,source=options.source||'A',slot=slots.includes(options.slot)?options.slot:'20:30',target=Number(options.target),observer=slot>='21:30',attrs=attributeFns(options),now=options.now??Date.now();
 const quality={identity:false,total:0,duplicateRows:0,invalidRows:0,conflicts:0,missing:0,invalidSnapshot:0,pending:0,matched:0,wrongZodiacYear:0};
 const definitions=[];for(const key of Object.keys(keys))for(const span of Object.keys(spans))for(const mode of Object.keys(modes))definitions.push({id:[key,span,mode].join('|'),key,span,mode,label:keys[key]+' · '+spans[span].replace('名',mode==='distinct'?'种属性':'名号码')+' · '+modes[mode]});
 const empty=reason=>({lot,source,slot,target,observer,quality,current:{available:false,reason,pool:null},rules:definitions.map(r=>({...r,...separate([]),current:null})),reason});
 if(!['xa','gc'].includes(lot)||!['A','B'].includes(source)||data?.lot!==lot||data?.sourceId!==source)return empty('彩种或来源身份不符，未借用另一站资料');
 quality.identity=true;const rows=canonical(data.periods,slot,options.manual),historical=[];quality.duplicateRows=rows.duplicateRows;quality.invalidRows=rows.invalidRows;
 for(const [issue,p] of [...rows.by].sort((a,b)=>a[0]-b[0])){
  if(!Number.isFinite(target)||issue>=2026000+target)continue;quality.total++;
  if(rows.bad.has(issue)){quality.conflicts++;continue;}
  const draw=rows.local.get(p.period)||p.result;if(!drawValid(draw)){quality.pending++;continue;}
  const date=normalizedDay(draw.date||draw.d),checked=snapshot(p,slot,date,now,observer);
  if(!checked.value){if(checked.reason==='未采到该时点')quality.missing++;else quality.invalidSnapshot++;continue;}
  historical.push({issue,period:p.period,date,draw,s:checked.value});quality.matched++;
 }
 const p=rows.by.get(2026000+target),date=normalizedDay(options.date),currentResult=p?.result||rows.local.get(target),currentSnapshot=snapshot(p,slot,date,now,observer),current={available:false,reason:!p?'本期尚无独立档案':rows.bad.has(2026000+target)?'本期档案或开奖结果冲突':currentResult?'本期开奖结果已更新，仅供核对':currentSnapshot.reason,date,settled:!!currentResult,snapshot:currentSnapshot.value};
 current.available=!!p&&!rows.bad.has(2026000+target)&&!currentResult&&!!currentSnapshot.value;
 const rules=definitions.map(d=>{
  const tests=[];for(const row of historical){if(['zodiac','element'].includes(d.key)&&(row.date<'2026-02-17'||row.date>'2026-12-31'))continue;const c=candidate(row.s,d.key,d.span,d.mode,attrs);if(!c)continue;tests.push({issue:row.issue,period:row.period,date:row.date,...evaluate(c.pool,row.draw),values:c.values,pool:c.pool,normalNumbers:row.draw.n.slice(),specialNumber:row.draw.t});}
  const c=current.available?candidate(current.snapshot,d.key,d.span,d.mode,attrs):null;return {...d,...separate(tests),current:c};
 });
 quality.wrongZodiacYear=historical.filter(r=>r.date<'2026-02-17'||r.date>'2026-12-31').length;
 return {lot,source,slot,target,observer,quality,current,rules};
}
function priority(report){
 // Smallest deletion scopes from a fixed list, not historical winner selection.
 if(report.observer||!report.current.available)return [];
 const fixed=['tail|head3|numbers','sum|head3|numbers','tail|tail3|numbers','sum|tail3|numbers'];
 return fixed.map(id=>report.rules.find(r=>r.id===id)).filter(r=>r?.current?.pool.length>0&&r.current.pool.length<=15).sort((a,b)=>a.current.pool.length-b.current.pool.length||fixed.indexOf(a.id)-fixed.indexOf(b.id)).slice(0,3);
}
const cache=new Map(),jobs=new Map();let generation=0;
function live(){if(typeof CUR_LOT==='undefined'||typeof NEXT==='undefined'||typeof DR==='undefined')return null;const lot=CUR_LOT,target=Number(NEXT),manual=typeof __DR_FULL!=='undefined'&&__DR_FULL?__DR_FULL:DR;let date=null;try{date=normalizedDay(pToDate(target));}catch{}return {lot,target,manual,date,attrs:{tail:n=>n%10,sum:n=>Math.floor(n/10)+n%10,element:typeof gwx==='function'?gwx:undefined,zodiac:typeof gz==='function'?gz:undefined},now:Date.now()};}
function prefs(){const p=typeof UP==='undefined'?{}:UP.attribute138||{};return {source:['A','B'].includes(p.source)?p.source:'A',slot:slots.includes(p.slot)?p.slot:'20:30',key:keys[p.key]?p.key:'tail',span:spans[p.span]?p.span:'head3',mode:modes[p.mode]?p.mode:'numbers'};}
function identity(c){return c.lot+'|'+c.target+'|'+JSON.stringify(c.manual.map(r=>[r.p,r.d||r.date,r.n,r.t]));}
function displayAttributes(n,c){let z='?',wx='?';try{z=c.attrs.zodiac?.(n)||'?';wx=c.attrs.element?.(n)||'?';}catch{}return fmt(n)+'（'+esc(z)+'·'+esc(wx)+'·合'+(Math.floor(n/10)+n%10)+'·尾'+n%10+'）';}
function actionContext(report,rule,c){const cutoff=Date.parse(c.date+'T21:30:00+08:00'),history=typeof winCurOff==='function'&&winCurOff()>0||typeof BACKFILL_STATE!=='undefined'&&BACKFILL_STATE?.running;
 const blocked=history?'历史回看仅供核对':!report.current.available?report.current.reason:report.observer?'21:30／21:35仅供开奖核对，不用于选号排除':rule.current?.full?'该集合覆盖全部49码，不能整池排除':!Number.isFinite(cutoff)||Date.now()>=cutoff?'本期观察已结束，请录入开奖后再操作':'';
 return {lot:c.lot,targetPeriod:c.target,sourcePeriod:c.target,sourceId:report.source,slot:report.slot,kind:'attribute138-'+rule.key,sourceMode:rule.id,referenceMode:'current',sourceSettled:report.current.settled,observer:report.observer,validUntil:cutoff,blockedReason:blocked};
}
function actions(report,rule,c){if(!rule.current)return '';return typeof PracticalActions!=='undefined'&&PracticalActions.excludeButtons?PracticalActions.excludeButtons(rule.current.pool,report.source+'站 '+report.slot+' 属性观察·'+rule.label,actionContext(report,rule,c)):'<p>操作组件尚未就绪，请刷新页面。</p>';}
function summaryLine(stat){return '正码零误排 '+rate(stat.normalZero,stat.n)+'／同宽随机 '+pct(stat.baselineZero)+'；平均误排 '+(stat.meanNormal===null?'—':stat.meanNormal.toFixed(2))+'个；特码避开 '+rate(stat.specialSafe,stat.n)+'／同宽随机 '+pct(stat.baselineSpecial);}
function judgement(rule){if(rule.current?.full)return '该集合覆盖全部49码，排除没有意义，操作已禁用。';if(rule.n<30||rule.training.n<20||rule.check.n<10)return '样本不足：先留存观察，不把高避开比例当成有效排除。';const normal=rule.training.normalZeroRate>rule.training.baselineZero&&rule.check.normalZeroRate>rule.check.baselineZero,special=rule.training.specialSafeRate>rule.training.baselineSpecial&&rule.check.specialSafeRate>rule.check.baselineSpecial;return (normal?'正码前后段均高于同宽基准':'正码未在前后段同时优于同宽基准')+'；'+(special?'特码前后段均高于同宽基准':'特码未在前后段同时优于同宽基准')+'。多条规则的历史探索不等于前向验证，不自动叠加硬排。';}
function currentCard(report,rule,c,compact=false){const selected=rule.current;return '<article class="attribute138-card"><h4>'+esc(rule.label)+'</h4>'+(selected?'<p>属性集合：【'+selected.values.map(esc).join('、')+'】；排除范围 '+selected.pool.length+'码</p><p class="attribute138-pool">'+selected.pool.map(n=>displayAttributes(n,c)).join('　')+'</p>'+(compact?'':'<p>取自榜单：'+selected.seeds.map(s=>'第'+s.rank+'名 '+displayAttributes(s.n,c)).join('；')+'</p>')+actions(report,rule,c):'<p>'+esc(report.current.reason||'当前属性映射未就绪，未以旧期代替')+'</p>')+'<p>'+summaryLine(rule)+'</p><p>'+esc(judgement(rule))+'</p></article>';}
function view(report,c,p){const row=report.rules.find(r=>r.key===p.key&&r.span===p.span&&r.mode===p.mode),q=report.quality,planned=priority(report);let h='<p class="attribute138-note">'+report.source+'站 · 第'+report.target+'期 · '+report.slot+(report.observer?'（只作最终核对）':'')+'。以下是“排掉这组会误删几个正码／会否删掉特码”的直接对照，不会自动修改筛选。具体合数是十位与个位相加，如49→13。</p>';
 h+='<p>档案期数 '+q.total+' → 有效同刻且已开奖 '+q.matched+'；未采到 '+q.missing+'，无效／迟到／日期不符 '+q.invalidSnapshot+'，待结果 '+q.pending+'，冲突 '+q.conflicts+'。重复行 '+q.duplicateRows+'不重复计期；非法期号行 '+q.invalidRows+'未纳入。生肖／五行因映射日期范围另少 '+q.wrongZodiacYear+'期。</p>';
 if(report.current.available)h+='<p>本期采集 '+esc(report.current.snapshot.collectedAt)+'；原站标时 '+esc(report.current.snapshot.websiteUpdatedAt||'未提供')+'。'+(p.mode==='distinct'?'按榜单首次出现顺序去重取属性，不是属性投注金额排行榜。':'先取指定名次的号码，再对它们的属性去重，实际可能少于3或5种。')+'</p>';
 if(!row)return h+'<p>没有匹配的规则。</p>';
 h+=currentCard(report,row,c)+'<div class="attribute138-scroll" data-scroll-key138="attribute138-'+report.source+'-'+report.slot+'"><table><thead><tr><th>同一规则</th><th>有效期</th><th>正码零误排</th><th>同宽随机</th><th>特码误排</th><th>特码避开／随机</th></tr></thead><tbody>'+[['全部历史',row],['历史前70%',row.training],['历史后30%',row.check]].map(([name,s])=>'<tr><th>'+name+'</th><td>'+s.n+'</td><td>'+rate(s.normalZero,s.n)+'</td><td>'+pct(s.baselineZero)+'</td><td>'+rate(s.specialFalse,s.n)+'</td><td>'+rate(s.specialSafe,s.n)+'／'+pct(s.baselineSpecial)+'</td></tr>').join('')+'</tbody></table></div><p>正码误排分布（每期只计6个正码）：'+row.normalDistribution.map((n,k)=>'误排'+k+'个：'+n+'期').join('；')+'。平码排除成功须6个正码全部避开，不以特码没开代替。</p><p>历史后30%仍是已经反复查看的旧资料；与前段分开能检查变化，但不冒充未见过的新样本。尾数／生肖等集合宽度会变，随机基准按每期实际删号数计算。</p>';
 h+='<details id="attribute138-history"><summary>查看逐期误排号码与实际计入的期号（'+row.n+'期）</summary>'+row.tests.slice(-50).reverse().map(t=>'<p>第'+t.period+'期：集合【'+t.values.map(esc).join('、')+'】／'+t.size+'码；误删正码【'+(t.normalHits.map(fmt).join('、')||'无')+'】；特码 '+fmt(t.specialNumber)+(t.special?' 被误排':' 避开')+'</p>').join('')+(row.n>50?'<p>这里只列最近50期；统计分母仍为全部有效'+row.n+'期。</p>':'')+'</details>';
 h+='<details id="attribute138-priority"><summary>较小范围的固定观察清单（不按历史最佳成绩挑选）</summary><p>只从前3／后3名的尾数、具体合数四条预设规则中，按本期删号范围较小优先，最多列3条。它们是可比较的观察对象，不是已证明有效的杀码。</p>'+(planned.length?planned.map(r=>currentCard(report,r,c,true)).join(''):'<p>当前没有满足小范围条件的有效集合，或本时点仅作核对。</p>')+'</details>';return h;}
function select(name,values,chosen){return '<select data-attribute138="'+name+'">'+Object.entries(values).map(([value,label])=>'<option value="'+value+'"'+(chosen===value?' selected':'')+'>'+esc(label)+'</option>').join('')+'</select>';}
function panel(){
 const p=prefs();if(typeof document!=='undefined')Promise.resolve().then(()=>mount());
 return '<section id="attribute-evidence138" class="card attribute138"><style>.attribute138{background:#fff!important;color:#142d43!important;font-size:14px;line-height:1.7}.attribute138 h3,.attribute138 h4{color:#123c5b}.attribute138 p{margin:7px 0}.attribute138 select,.attribute138 button{font-size:14px;min-height:35px;margin:3px;padding:4px 7px}.attribute138 select{background:#fff;color:#173b58;border:1px solid #71869b}.attribute138-card{border:1px solid #c5d6e4;border-radius:6px;padding:9px;margin:9px 0;background:#fff}.attribute138-pool{font-size:15px;font-weight:600;overflow-wrap:anywhere}.attribute138-note{padding:8px;background:#edf5fc;border-left:4px solid #2a648c}.attribute138-scroll{overflow:auto}.attribute138 table{border-collapse:collapse;min-width:680px;width:100%}.attribute138 th{background:#eaf2f9!important;color:#163e5d!important;font-size:13px!important;padding:7px}.attribute138 td{color:#173249!important;font-size:13px!important;padding:7px;border-bottom:1px solid #d4e0ea}.attribute138 summary{font-size:14px;padding:8px 0;color:#163c5b}</style><h3>尾数／具体合数／五行／生肖 · 属性排除对照</h3><div>'+select('source',{A:'A站',B:'B站'},p.source)+select('slot',Object.fromEntries(slots.map(s=>[s,s+(s>='21:30'?'（仅核对）':'')])),p.slot)+select('key',keys,p.key)+select('span',spans,p.span)+select('mode',modes,p.mode)+' <button type="button" data-attribute138-refresh>读取／刷新两站档案</button></div><div data-attribute138-output>正在读取本彩种独立档案…</div></section>';
}
function paint(box,c,key){
 if(!box?.isConnected)return;const viewState=typeof PracticalActions!=='undefined'&&PracticalActions.captureView?PracticalActions.captureView(box):null;
 try{const state=cache.get(key),p=prefs(),out=box.querySelector('[data-attribute138-output]');if(!out)return;if(!state){out.innerHTML='<p>尚未取得档案，请点击读取。</p>';return;}const data=state.data[p.source];if(!data){out.innerHTML='<p>'+esc(p.source+'站读取失败；不会借用另一站或旧期代替。请稍后重试。')+'</p>';return;}out.innerHTML=view(study(data,{...c,...p}),c,p);}
 finally{if(viewState&&typeof PracticalActions!=='undefined'&&PracticalActions.restoreView)PracticalActions.restoreView(viewState);}
}
async function mount(force=false){const c=live();if(!c||typeof document==='undefined')return;const box=document.getElementById('attribute-evidence138');if(!box)return;if(!['xa','gc'].includes(c.lot)){box.querySelector('[data-attribute138-output]').textContent='当前仅新澳、港彩有两站数据，不跨彩种套用。';return;}const key=identity(c),old=cache.get(key);if(!force&&old&&Date.now()-old.at<120000){paint(box,c,key);return;}if(jobs.has(key)){await jobs.get(key);const current=live();if(current&&identity(current)===key)paint(document.getElementById('attribute-evidence138'),current,key);return;}if(typeof BettingData71==='undefined'||typeof BettingData71.study125!=='function'){box.querySelector('[data-attribute138-output]').textContent='两站读取组件尚未就绪，请刷新页面。';return;}
 const task=(async()=>{const rs=await Promise.allSettled(['A','B'].map(source=>BettingData71.study125(c.lot,source,c.manual,c.target)));cache.set(key,{at:Date.now(),data:Object.fromEntries(rs.map((r,i)=>[['A','B'][i],r.status==='fulfilled'?r.value:null]))});if(cache.size>3)cache.delete(cache.keys().next().value);})(),g=++generation;jobs.set(key,task);
 try{await task;const current=live();if(g===generation&&current&&identity(current)===key)paint(document.getElementById('attribute-evidence138'),current,key);}catch(e){if(box.isConnected)box.querySelector('[data-attribute138-output]').textContent='本次读取失败，请稍后重试。';}finally{jobs.delete(key);}
}
if(typeof document!=='undefined'){
 document.addEventListener('change',e=>{if(!e.target.matches('[data-attribute138]'))return;const name=e.target.dataset.attribute138;UP.attribute138={...prefs(),[name]:e.target.value};if(typeof saveData==='function')saveData();const c=live();if(c)paint(document.getElementById('attribute-evidence138'),c,identity(c));});
 document.addEventListener('click',e=>{if(e.target.closest('[data-attribute138-refresh]'))mount(true);});
}
const api={keys,spans,modes,slots,candidate,evaluate,summarize,study,priority,snapshot,canonical,panel,mount,refresh:()=>mount(true),view,actionContext};root.AttributeEvidence138=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
