(function(){
'use strict';
const animals=[...'鼠牛虎兔龙蛇马羊猴鸡狗猪'];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ball=n=>String(n).padStart(2,'0');
const iso=r=>{const s=String(r?.date||r?.d||'');return /^\d{2}\/\d{2}$/.test(s)?'2026-'+s.replace('/','-'):s.slice(0,10);};
const supported=r=>iso(r)>='2026-02-17'&&iso(r)<'2027-01-01';
const values=a=>(a||[]).map(x=>typeof x==='string'?x:x?.z);
const validNine=a=>Array.isArray(a)&&a.length===9&&new Set(a).size===9&&a.every(z=>animals.includes(z));
const rate=(a,b)=>b?`${a}/${b}（${(a/b*100).toFixed(1)}%）`:'暂无样本';
const pct=x=>(100*x).toFixed(1)+'%';
function table(heads,rows){const line=(tag,row)=>'<tr>'+row.map(x=>'<'+tag+'>'+esc(x)+'</'+tag+'>').join('')+'</tr>';return '<div style="overflow-x:auto"><table style="min-width:530px;width:100%;font-size:12px">'+line('th',heads)+rows.map(r=>line('td',r)).join('')+'</table></div>';}
function nine(period,lot,prefs){
  for(const [p,z] of [[prefs.lx9_seq1_period,prefs.lx9_seq1],[prefs.lx9_seq2_period,prefs.lx9_seq2],[prefs.lx9_seq0_period,prefs.lx9_seq0]])if(+p===period&&validNine(z))return {z,label:'已设置九肖'};
  const history=(prefs.lx9_history||[]).findLast(x=>+x.p===period&&+x.seq1_period===period&&validNine(x.seq1));
  if(history)return {z:history.seq1,label:'同期开奖对应的九肖留档'};
  const source=(prefs.external_materials||[]).findLast(x=>x.lot===lot&&+x.period===period&&x.game==='te'&&x.slot==='九肖'&&validNine(x.values));
  return source?{z:source.values,label:'同一期已跟进九肖'}:null;
}
function intersections(lot,prefs){
  const chosen=new Map();
  const records=[...(prefs.sourceIntersectionHistory||[]).filter(r=>r.items?.length===3).map(r=>({lot:r.lot,period:+r.period,pool:r.pool,time:r.savedAt})),...(prefs.intersectionHistory||[]).filter(r=>r.result?.sets?.length===3&&!['lx','pt'].includes(r.game)).map(r=>({lot:r.lot,period:+r.targetPeriod,pool:r.result.all,time:r.createdAt}))];
  for(const r of records){
    if(r.lot!==lot||!Number.isInteger(r.period)||!Array.isArray(r.pool)||!r.pool.every(n=>Number.isInteger(n)&&n>=1&&n<=49))continue;
    const old=chosen.get(r.period);
    if(!old||(r.time||'')>=(old.time||''))chosen.set(r.period,{...r,pool:[...new Set(r.pool)]});
  }
  return chosen;
}
function settled(periods,manual){
  const bare=periods.map(p=>({issue:p.issue,period:p.period,result:p.result,last:{numbers:A49,zodiacs:animals}}));
  const report=BettingAnalysis71.analyze(bare,manual,gz);
  const conflicts=new Set(report.conflicts.map(x=>+x.period));
  const draws=new Map(planClean(manual).rows.filter(r=>!conflicts.has(r.p)).map(r=>[r.p,r]));
  for(const r of report.items)if(r.year===2026&&!draws.has(r.period))draws.set(r.period,{...r.draw,p:r.period,date:r.date});
  return [...draws.values()].sort((a,b)=>a.p-b.p);
}
function coldStudy(draws,clockItems,target){
  const ranked=new Map(clockItems.map(r=>[r.period,r.snapshot.zodiacs]));
  const stats=new Map(animals.map(z=>[z,{n:0,normal:0,special:0,seven:0,ranked:0,top:0,topSeven:0}]));
  const absent=(rows,p)=>rows.length===6&&rows.every((r,i)=>r.p===p-6+i&&supported(r))?animals.filter(z=>!rows.some(r=>r.n.concat(r.t).some(n=>gz(n)===z))):null;
  for(let i=6;i<draws.length;i++){
    const d=draws[i];if(!supported(d))continue;
    const missing=absent(draws.slice(i-6,i),d.p);if(!missing)continue;
    for(const z of missing){
      const a=stats.get(z),normal=d.n.some(n=>gz(n)===z),special=gz(d.t)===z,rank=ranked.get(d.p)?.indexOf(z)??-1;
      a.n++;a.normal+=normal;a.special+=special;a.seven+=normal||special;
      if(rank>=0){a.ranked++;if(rank<4){a.top++;a.topSeven+=normal||special;}}
    }
  }
  const missing=absent(draws.filter(r=>r.p<target).slice(-6),target);
  return {stats,missing};
}
function panel({lot,prefs,periods,manual,reports,slot}){
  const draws=settled(periods,manual),latest=draws.at(-1),target=latest?latest.p+1:null;
  const focus=reports.find(x=>x.slot===slot),clockItems=focus?.report.items.filter(r=>{
    const delay=Date.parse(r.snapshot.collectedAt)-Date.parse(r.snapshot.scheduledAt);
    return r.year===2026&&r.snapshot.scheduledAt?.slice(11,16)===slot&&delay>=0&&delay<=60000;
  })||[];
  const selected=latest&&clockItems.find(r=>r.period===latest.p);
  const snapshot=selected?.snapshot,seq=latest&&nine(latest.p,lot,prefs),nextSeq=target&&nine(target,lot,prefs);
  const picks=intersections(lot,prefs),checked=draws.filter(d=>picks.has(d.p)).map(d=>{
    const r=picks.get(d.p),normal=d.n.filter(n=>r.pool.includes(n)),te=r.pool.includes(d.t);
    return {d,r,normal,te};
  });
  const matched=checked.reduce((s,r)=>s+r.normal.length,0),teHits=checked.filter(x=>x.te).length;
  const lines=latest?.n.concat(latest.t).map((n,i)=>{
    const z=supported(latest)?gz(n):null,rank=snapshot?.zodiacs.indexOf(z),flat=values(snapshot?.flatZodiacs).indexOf(z),pos=seq?.z.indexOf(z),pool=picks.get(latest.p)?.pool;
    return [i===6?'特码':'正码'+(i+1),ball(n),z||'—',rank>=0?rank+1:'—',flat>=0?flat+1:'—',!seq||!z?'—':pos>=0?'第'+(pos+1)+'位':'九肖外',pool?pool.includes(n)?'中':'未中':'—'];
  })||[];
  const zTe=lines.at(-1),seqHits=lines.filter(r=>/^第/.test(r[5])).length;
  const study=coldStudy(draws,slot<'21:30'?clockItems:[],target);
  const rows=[...study.stats].map(([z,x])=>{
    const base=BettingAnalysis71.any(A49.filter(n=>gz(n)===z).length,7);
    return {z,...x,base,estimate:(x.seven+12*base)/(x.n+12)};
  });
  const candidate=rows.filter(x=>study.missing?.includes(x.z)&&x.n>=5).sort((a,b)=>(a.estimate-a.base)-(b.estimate-b.base))[0];
  const low=candidate&&candidate.estimate<candidate.base?candidate:null;
  const totals=rows.reduce((a,x)=>({ranked:a.ranked+x.ranked,top:a.top+x.top,topSeven:a.topSeven+x.topSeven}),{ranked:0,top:0,topSeven:0});
  return '<section id="bet-review123" class="card"><h3>上期七球 · 同刻生肖排名、三网交集与九肖</h3>'
    +'<label>核对时点 <select data-bet-mode88>'+BettingFocus88.modes.filter(x=>['20:00','20:30','21:00','21:35'].includes(x.slot)).map(x=>'<option value="'+x.id+'"'+(x.slot===slot?' selected':'')+'>'+x.label+'</option>').join('')+'</select></label>'
    +'<p>'+(latest?'最近已核对第'+latest.p+'期 · '+esc(slot)+' · '+(snapshot?'同期榜单':'缺少同刻有效榜单')+'。':'暂无已核对开奖。')+(zTe&&typeof zTe[3]==='number'?'特肖 '+esc(zTe[2])+' 排第'+zTe[3]+'名。':'')+'</p>'
    +(lines.length?table(['开奖位置','号码','生肖','生肖榜排名','独立平特榜排名','九肖序位','交集'],lines):'')
    +'<p>'+ (seq?'自动应用'+esc(seq.label)+'【'+seq.z.join('、')+'】，覆盖 '+seqHits+'/7 球。':'本期暂无对应的九肖留档。')+(nextSeq?' 下期已读取九肖【'+nextSeq.z.join('、')+'】。':'')+' 排名按同一期、同一来源和时点匹配。</p>'
    +'<h4>我的三网交集</h4><p>'+ (checked.length?'已核对 '+checked.length+'期，合计中 '+matched+'个正码，平均每期 '+(matched/checked.length).toFixed(2)+'个；中特 '+rate(teHits,checked.length)+'；正码至少中3个 '+rate(checked.filter(x=>x.normal.length>=3).length,checked.length)+'。':'暂无可和开奖配对的三网交集记录。')+' 同期多份取最后保存的一份。</p>'
    +(checked.length?'<details><summary>逐期查看交集号码和命中位置</summary>'+table(['期号','交集号码','中正码','中特'],checked.slice(-30).reverse().map(x=>[x.d.p,x.r.pool.map(ball).join('、')||'空集',x.normal.length+'个 '+x.normal.map(ball).join('、'),x.te?'1个 '+ball(x.d.t):'0个']))+'</details>':'')
    +'<h4>42码整肖未出 · 反向观察</h4><p>'+(!study.missing?'连续六期记录不齐，暂无法判断。':study.missing.length?'第'+target+'期观察【'+study.missing.join('、')+'】。':'最近六期每个生肖都至少出现过一次。')+(low?' 可优先观察排除 '+low.z+'，历史七球出现 '+rate(low.seven,low.n)+'，平滑估计 '+pct(low.estimate)+'，同宽随机 '+pct(low.base)+'。':study.missing?.length?' 目前未找到样本足够且低于同宽基准的排除候选。':'')+'</p>'
    +'<p>以连续六期共42球为观察窗口。以该期开奖前同刻生肖榜前4名作为「追热」指标。21:35用于开奖核对。'+(totals.ranked?' 有同刻榜单的整肖未出样本中，进前4 '+rate(totals.top,totals.ranked)+'；进前4后七球未见 '+rate(totals.top-totals.topSeven,totals.top)+'。分母按期×生肖计。':' 暂无匹配的开奖前榜单可核对追热。')+'</p>'
    +table(['生肖','整肖未出后开平肖','开特肖','七球出现／随机','同期进前4／有榜期','进前4后七球出现'],rows.map(x=>[x.z,rate(x.normal,x.n),rate(x.special,x.n),rate(x.seven,x.n)+' / '+pct(x.base),rate(x.top,x.ranked),rate(x.topSeven,x.top)]))+'</section>';
}
window.BettingReview123={panel};
})();
