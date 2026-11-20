(function(root){
'use strict';
const animals=[...'鼠牛虎兔龙蛇马羊猴鸡狗猪'],balls=Array.from({length:49},(_,i)=>i+1);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const zs=s=>(s?.zodiacs||[]).map(x=>typeof x==='string'?x:x.z);
const ns=s=>(s?.numbers||[]).map(x=>typeof x==='number'?x:x.n);
const flat=s=>(s?.flatZodiacs||[]).map(x=>typeof x==='string'?x:x.z);
const valid=(a,universe)=>a.length===universe.length&&new Set(a).size===a.length&&a.every(x=>universe.includes(x));
function choose(n,k){if(k<0||k>n)return 0;let a=1;for(let i=1;i<=k;i++)a=a*(n-i+1)/i;return a;}
function zero(size,k){return choose(49-size,k)/choose(49,k);}
function stats(tests){
  const n=tests.length,sum=k=>tests.reduce((a,t)=>a+t[k],0);
  return {n,normalZero:sum('normalZero'),specialZero:sum('specialZero'),triple:sum('triple'),baseNormal:sum('baseNormal'),baseSpecial:sum('baseSpecial'),baseTriple:sum('baseTriple'),meanNormal:n?sum('normalCount')/n:null};
}
function evaluate(pool,draw,zod,zodiac=false){
  const p=new Set(zodiac?balls.filter(n=>pool.includes(zod(n))):pool),normal=draw.n.filter(n=>p.has(n)).length;
  let triple=0;for(let k=3;k<=6;k++)triple+=choose(p.size,k)*choose(49-p.size,6-k)/choose(49,6);
  return {normalZero:Number(!normal),specialZero:Number(!p.has(draw.t)),triple:Number(normal>=3),normalCount:normal,baseNormal:zero(p.size,6),baseSpecial:1-p.size/49,baseTriple:triple};
}
const rules=[
  {id:'sameNumber',label:'当期两站同名次号码',pool:(a,b)=>ns(a).filter((n,i)=>n===ns(b)[i])},
  {id:'sameZodiac',label:'当期两站同名次生肖',zodiac:true,pool:(a,b)=>zs(a).filter((z,i)=>z===zs(b)[i])},
  {id:'previousNumber',label:'上期两站同名次号码→本期',previous:true,pool:(a,b)=>ns(a).filter((n,i)=>n===ns(b)[i])},
  {id:'previousZodiac',label:'上期两站同名次生肖→本期',previous:true,zodiac:true,pool:(a,b)=>zs(a).filter((z,i)=>z===zs(b)[i])},
  ...['A','B','flat'].map(key=>({id:'nine'+key,label:(key==='flat'?'B站独立平特':key+'站生肖榜')+'前九肖',zodiac:true,nine:true,source:key==='A'?'A':'B',pool:(a,b)=>key==='A'?zs(a).slice(0,9):key==='B'?zs(b).slice(0,9):valid(flat(b),animals)?flat(b).slice(0,9):null}))
];
function analyze(aItems,bItems,{zod,target,currentA,currentB}={}){
  const clean=items=>new Map(items.filter(r=>valid(ns(r.snapshot),balls)&&valid(zs(r.snapshot),animals)&&r.date>='2026-02-17'&&r.date<='2026-12-31').map(r=>[Number(r.issue),r]));
  const A=clean(aItems),B=clean(bItems),paired=[...A.keys()].filter(i=>B.has(i)&&A.get(i).date===B.get(i).date).sort((a,b)=>a-b);
  const conflicts=paired.filter(i=>JSON.stringify([...A.get(i).draw.n].sort((a,b)=>a-b).concat(A.get(i).draw.t))!==JSON.stringify([...B.get(i).draw.n].sort((a,b)=>a-b).concat(B.get(i).draw.t)));
  const usable=paired.filter(i=>!conflicts.includes(i));
  const rows=rules.map(rule=>{
    const tests=[];let empty=0,missing=0;
    const ruleIssues=rule.source?[...(rule.source==='A'?A:B).keys()].filter(i=>!conflicts.includes(i)).sort((a,b)=>a-b):usable;
    for(const issue of ruleIssues){
      const sourceIssue=rule.previous?issue-1:issue;
      if(!ruleIssues.includes(sourceIssue)){missing++;continue;}
      const pool=rule.pool(A.get(sourceIssue)?.snapshot,B.get(sourceIssue)?.snapshot);
      if(!pool?.length){empty++;continue;}
      const draw=(rule.source==='B'?B.get(issue):A.get(issue)).draw,hit=evaluate(pool,draw,zod,rule.zodiac);
      tests.push({...hit,issue,pool,seven:rule.zodiac?pool.filter(z=>draw.n.concat(draw.t).some(n=>zod(n)===z)).length:null});
    }
    const previousIssue=target?2026000+target-1:null;
    const aa=rule.previous?A.get(previousIssue)?.snapshot:currentA,bb=rule.previous?B.get(previousIssue)?.snapshot:currentB;
    const current=(rule.source==='A'?aa:rule.source==='B'?bb:aa&&bb)?rule.pool(aa,bb):null,split=Math.floor(tests.length*.7);
    return {...rule,tests,...stats(tests),early:stats(tests.slice(0,split)),check:stats(tests.slice(split)),empty,missing,current};
  });
  return {target,a:A.size,b:B.size,paired:paired.length,conflicts:conflicts.length,n:usable.length,rows};
}
const rate=(h,n)=>n?h+'/'+n+'（'+(100*h/n).toFixed(1)+'%）':'暂无样本';
function table(heads,rows){return '<div style="overflow-x:auto"><table style="min-width:650px;width:100%;font-size:12px"><tr>'+heads.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+esc(c)+'</td>').join('')+'</tr>').join('')+'</table></div>';}
function html(report){
  return '<h4>两站同排名／前九肖验证</h4><p>A站有效 '+report.a+'期，B站有效 '+report.b+'期，同期同刻可配对 '+report.paired+'期，开奖冲突 '+report.conflicts+'期，实际核对 '+report.n+'期。下表每条规则每期仅计一次，空集合跳过，不记成排除成功。</p>'
    +table(['规则','有效期／空组／缺上期','正码全避开','特码避开','池内至少3个正码','平均中正码','后30%正码全避开'],report.rows.map(r=>[r.label,r.n+' / '+r.empty+' / '+r.missing,rate(r.normalZero,r.n),rate(r.specialZero,r.n),rate(r.triple,r.n),r.meanNormal?.toFixed(2)??'—',rate(r.check.normalZero,r.check.n)]))
    +report.rows.filter(r=>r.current?.length).map(r=>'<p><b>'+esc(r.label)+'</b> 【'+r.current.map(x=>esc(typeof x==='number'?String(x).padStart(2,'0'):x)).join('、')+'】'+(r.nine?' · 连肖候选池，仍须检查当前组限制。 <button type="button" data-nine125="'+r.current.join(',')+'" data-target125="'+report.target+'">应用到本期九肖①</button>':' · 候选排除观察池。')+' 历史排除正码 '+rate(r.normalZero,r.n)+'，相同池宽随机 '+(r.n?(100*r.baseNormal/r.n).toFixed(1)+'%':'—')+'；排除特码 '+rate(r.specialZero,r.n)+'，随机 '+(r.n?(100*r.baseSpecial/r.n).toFixed(1)+'%':'—')+'。'+(r.n<20?'样本不足20期，暂不自动加权。':'先固定规则继续前向留存，不按整段最优结果自动排除。')+'</p>').join('')
    +report.rows.filter(r=>r.nine).map(r=>'<p>'+esc(r.label)+'覆盖的七球不同生肖数分布 '+Array.from({length:8},(_,k)=>k+'肖 '+r.tests.filter(t=>t.seven===k).length+'期').join(' · ')+'。不等于九连肖全中。</p>').join('')
    +'<p>前九肖集合可以连续两期相同，名次顺序相同也并非不可能。两站同排名只是待检验特征；正码避开、特码避开和三中三至少3码分开核对。多规则筛选所得表现不等于下期保证。</p>';
}
function attributes125(rows,attrs,model){
  if(!rows.length)return '<p>没有可用开奖记录。</p>';
  const keys=['单双','大小','合数单双','波色','五行','家野','尾数'],latest=model.compute(rows,attrs,keys),tests=[];
  for(let i=Math.max(20,rows.length-30);i<rows.length;i++){
    if(rows[i-1].p+1!==rows[i].p)continue;
    const prior=model.compute(rows.slice(0,i),attrs,keys);
    tests.push({actual:attrs(rows[i].t),selected:Object.fromEntries(keys.map(k=>[k,prior.evidence[k][0]]))});
  }
  const normal=[];
  for(const key of ['生肖','尾数']){
    const recent=rows.slice(-60),values=[...new Set(balls.map(n=>attrs(n)[key]))];
    const scored=values.map(v=>{const size=balls.filter(n=>attrs(n)[key]===v).length,base=1-zero(size,6),hits=recent.filter(r=>r.n.some(n=>attrs(n)[key]===v)).length;return {v,size,base,hits,n:recent.length,estimate:(hits+24*base)/(recent.length+24)};}).sort((a,b)=>(a.estimate-a.base)-(b.estimate-b.base));
    const lo=scored[0],hi=scored.at(-1);
    normal.push([key,'候选保留 '+hi.v,rate(hi.hits,hi.n),'候选排除 '+lo.v,rate(lo.n-lo.hits,lo.n),'排除随机 '+(100*(1-lo.base)).toFixed(1)+'%']);
  }
  return '<h4>特码各属性候选 · 每项明确给出一个选择</h4><p>依据截至第'+rows.at(-1).p+'期的记录重新计算；历史核对逐期只使用此前资料。相同建议可能连续出现，不为变化而随机更换。</p>'+table(['属性','本期候选','对应码数','近30期前向回测','同宽随机','候选排除'],keys.map(k=>{const a=latest.evidence[k],top=a[0],hit=tests.filter(t=>t.actual[k]===t.selected[k].v).length,base=tests.length?tests.reduce((n,t)=>n+t.selected[k].base,0)/tests.length:0;return [k,top.v,top.width,rate(hit,tests.length),tests.length?(100*base).toFixed(1)+'%':'—',a.at(-1).v];}))+'<h4>正码／平肖候选保留与排除</h4>'+table(['属性','保留观察','过去60期出现','排除观察','过去60期全避开','基准'],normal)+'<p>正码候选按近60期相对同宽基准排序，属于当前样本内探索，还未获得前向验证。特码表为不同属性各自的选择，不能把这些属性的概率相乘，也不会自动叠加排除。排除一个生肖或尾数会同时排走其中可能开出的号码。</p>';
}
function panel(){return '<details class="card" id="rank-study125"><summary>两站／两彩对照、九肖与正码排除结论</summary><button type="button" data-rank-study125>计算同刻对照</button><div data-rank-result125></div></details>';}
async function show(box){
  const lot=CUR_LOT,target=NEXT,out=box.querySelector('[data-rank-result125]');
  if(!['xa','gc'].includes(lot)){out.textContent='目前只有新澳与港彩提供两站榜单。';return;}
  if(winCurOff()>0){out.textContent='请回到当前预测期后计算候选。';return;}out.textContent='正在读取两站独立留存…';
  const results=await Promise.allSettled(['A','B'].map(s=>BettingData71.study125(lot,s,DR.slice(),target)));
  if(!box.isConnected||CUR_LOT!==lot||NEXT!==target)return;
  if(results.some(r=>r.status!=='fulfilled')){out.textContent='两站资料未齐，本次不计算。请分别核对来源A、B的采集状态。';return;}
  const [a,b]=results.map(r=>r.value),slot=UP.te_betting_analysis88==='slot2030'?'20:30':'21:00';
  const items=x=>x.reports.find(r=>r.slot===slot)?.report.items||[];
  const report=analyze(items(a),items(b),{zod:gz,target,currentA:slot==='20:30'?a.currentEarly:a.currentLate,currentB:slot==='20:30'?b.currentEarly:b.currentLate});
  out.innerHTML='<p>当前彩种 '+(lot==='xa'?'新澳':'港彩')+' · '+slot+' · 第'+target+'期。20:30与21:00独立计算，其他更新点保留实际采集时间。</p>'+html(report);
  // Other lottery stays a separate dated observation; its issue number is never joined to this lottery.
  const other=lot==='xa'?'gc':'xa';
  const cross=await Promise.allSettled(['A','B'].map(s=>BettingData71.study125(other,s,[],null)));
  if(!box.isConnected||CUR_LOT!==lot||NEXT!==target)return;
  if(cross.every(x=>x.status==='fulfilled')){
    const maps=cross.map(x=>new Map(items(x.value).map(r=>[r.date,r]))),dates=[...new Set(items(a).map(r=>r.date))].filter(d=>maps.every(m=>m.has(d)));
    const own=new Map(items(a).map(r=>[r.date,r]));
    out.innerHTML+='<h4>新澳／港彩同期日期对照</h4><p>仅按日期与'+slot+'配对，各彩期号独立。两彩同日榜单相似度用于观察，不移用对方开奖结果。</p>'+table(['日期','本彩期号','另一彩期号','A站前九肖重合','B站前九肖重合'],dates.sort().slice(-20).map(d=>{const x=own.get(d),y=maps[0].get(d),ownB=items(b).find(r=>r.date===d);return [d,x.period,y.period,zs(x.snapshot).slice(0,9).filter(z=>zs(y.snapshot).slice(0,9).includes(z)).length,ownB?zs(ownB.snapshot).slice(0,9).filter(z=>zs(maps[1].get(d).snapshot).slice(0,9).includes(z)).length:'缺本彩B站'];}));
  }else out.innerHTML+='<p>另一彩同刻资料暂缺，保留本彩结果。</p>';
}
if(typeof document!=='undefined')document.addEventListener('click',e=>{const nine=e.target.closest('[data-nine125]');if(nine){const list=nine.dataset.nine125.split(',');if(Number(nine.dataset.target125)!==NEXT||winCurOff()>0){showClickFeedback('期号已变化，请重新计算当前期');return;}if(list.length===9&&new Set(list).size===9&&list.every(z=>animals.includes(z))){UP.lx9_seq1=list;UP.lx9_seq1_period=NEXT;saveData();showClickFeedback('已应用本期九肖①，原有必选和排除限制继续保留');}return;}const b=e.target.closest('[data-rank-study125]');if(!b)return;b.disabled=true;show(b.closest('#rank-study125')).catch(()=>{b.parentElement.querySelector('[data-rank-result125]').textContent='本次对照未完成，请重试。';}).finally(()=>b.disabled=false);});
if(typeof document!=='undefined'){
 document.addEventListener('DOMContentLoaded',()=>{const base=window.render;window.render=function(){const result=base.apply(this,arguments);if(activeTab==='te'&&!document.getElementById('attribute-picks125'))document.getElementById('tabContent')?.insertAdjacentHTML('beforeend','<section class="card" id="attribute-picks125"><h3>正特属性取舍建议</h3><button type="button" data-attribute125>计算当前属性与历史表现</button><div data-attribute-output125></div></section>');return result;};});
 document.addEventListener('click',e=>{if(!e.target.closest('[data-attribute125]'))return;const out=document.querySelector('[data-attribute-output125]'),rows=planClean(DR).rows.filter(r=>{const d=String(r.date||r.d||'').replace('/','-'),date=d.length===5?'2026-'+d:d;return date>='2026-02-17'&&date<='2026-12-31';});out.innerHTML=attributes125(rows,n=>({'生肖':gz(n),'单双':gpar(n),'大小':gsz(n),'合数单双':ghe(n),'波色':gwv(n),'五行':gwx(n),'家野':gfam(n),'尾数':n%10}),EvidenceModel80);});
}
root.RankStudy125={analyze,evaluate,html,panel,attributes125};if(typeof module!=='undefined')module.exports=root.RankStudy125;
})(typeof window==='undefined'?globalThis:window);
