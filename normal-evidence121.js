(function(){
'use strict';
const balls=Array.from({length:49},(_,i)=>i+1);
const zodiac=[...'鼠牛虎兔龙蛇马羊猴鸡狗猪'];
const pct=(h,n)=>n?`${h}/${n}（${(100*h/n).toFixed(1)}%）`:'—';
const band=(rank,length)=>Math.floor(rank*3/length);
const tally=()=>({n:0,normal:0,special:0,seven:0,base:0});
const add=(a,normal,special,base)=>{a.n++;a.normal+=normal;a.special+=special;a.seven+=normal||special;a.base+=base;};
function recurrence(rows,zod,element){
  const sample=rows.filter(r=>{const date=String(r.date||r.d||'').replace('/','-');const iso=date.length===5?'2026-'+date:date;return iso>='2026-02-17'&&iso<='2026-12-31';});
  return [...zodiac,...'金木水火土'].map(label=>{
    const match=z=>z===label||element(z)===label;
    const normal=r=>r.n.some(n=>match(zod(n))),special=r=>match(zod(r.t));
    const out={label,repeat:[0,0],returning:[0,0],fromSpecial:[0,0],normal:0,special:0,n:sample.length};
    sample.forEach((r,i)=>{
      const hit=normal(r);out.normal+=hit;out.special+=special(r);
      const previous=sample[i-1];if(!previous||previous.p+1!==r.p)return;
      const group=normal(previous)?out.repeat:out.returning;group[0]+=hit;group[1]++;
      if(special(previous)){out.fromSpecial[0]+=hit;out.fromSpecial[1]++;}
    });
    return out;
  });
}
function rankEvidence(items,zod,any){
  const bands={number:[tally(),tally(),tally()],zodiac:[tally(),tally(),tally()],flat:[tally(),tally(),tally()]};
  for(const {snapshot,draw,date} of items){
    const normal=new Set(draw.n);
    snapshot.numbers.forEach((n,i)=>add(bands.number[band(i,49)],normal.has(n),draw.t===n,6/49));
    if(date<'2026-02-17'||date>'2026-12-31')continue;
    const normalZ=new Set(draw.n.map(zod)),special=zod(draw.t);
    const flat=(snapshot.flatZodiacs||[]).map(x=>typeof x==='string'?x:x.z);
    for(const [key,list] of [['zodiac',snapshot.zodiacs],['flat',flat]]){
      if(list.length!==12||new Set(list).size!==12||!list.every(z=>zodiac.includes(z)))continue;
      list.forEach((z,i)=>add(bands[key][band(i,12)],normalZ.has(z),special===z,any(balls.filter(n=>zod(n)===z).length,6)));
    }
  }
  return bands;
}
function shares(snapshot,key){
  const rows=key==='zodiacs'?snapshot?.zodiacAmounts:snapshot?.flatZodiacs;
  if(!Array.isArray(rows)||rows.length!==12||new Set(rows.map(x=>x?.z)).size!==12||!rows.every(x=>zodiac.includes(x?.z)&&Number.isFinite(x.money)&&x.money>=0))return null;
  const sum=rows.reduce((a,x)=>a+x.money,0);
  return sum?new Map(rows.map(x=>[x.z,x.money/sum])):null;
}
const movementBand=d=>d>0.00005?0:d< -0.00005?2:1;
function movements(early,late,zod,normalBaseline){
  const result=[];
  const other=new Map(early.map(x=>[x.issue,x]));
  for(const key of ['zodiacs','flatZodiacs']){
    const groups=[tally(),tally(),tally()];let n=0;
    for(const item of late){
      const before=other.get(item.issue);if(!before||item.date<'2026-02-17'||item.date>'2026-12-31')continue;
      const a=shares(before.snapshot,key),b=shares(item.snapshot,key);if(!a||!b)continue;
      const normal=new Set(item.draw.n.map(zod)),special=zod(item.draw.t);n++;
      for(const z of zodiac){const d=b.get(z)-a.get(z);add(groups[movementBand(d)],normal.has(z),special===z,normalBaseline(z));}
    }
    result.push({key,n,groups});
  }
  return result;
}
const rowHtml=(a)=>'<tr>'+a.map(x=>'<td>'+x+'</td>').join('')+'</tr>';
const table=(heads,rows)=>'<div style="overflow-x:auto"><table style="min-width:550px;width:100%;font-size:11px"><thead><tr>'+heads.map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+rows.map(rowHtml).join('')+'</tbody></table></div>';
function panel(game,pool=[]){
  return '<details class="card" id="normal-evidence121" data-game="'+game+'" data-pool="'+pool.join(',')+'"><summary>正码／平肖证据评分与再出统计</summary><button type="button" data-evidence121>计算当前彩种</button><div data-evidence-result121></div></details>';
}
async function show(box){
  if(typeof winCurOff==='function'&&winCurOff()>0){box.querySelector('[data-evidence-result121]').textContent='请回到当前预测期后计算。';return;}
  const lot=CUR_LOT,source=UP.te_betting_source103||'A',game=box.dataset.game,rows=planClean(DR).rows;
  const trend=recurrence(rows,gz,zodWx),out=box.querySelector('[data-evidence-result121]');
  const pool=box.dataset.pool.split(',').filter(Boolean).map(x=>game==='z3'?Number(x):x);
  const last=rows.at(-1),stats=new Map(trend.map(x=>[x.label,x]));
  const header='<h4>各生肖与生肖五行 · 平肖只按6个正码去重</h4>'+table(['生肖／五行','平肖出现','特肖出现','上期平肖出现→再出','上期平肖没出→补出','上期特肖→本期平肖'],trend.map(x=>[x.label,pct(x.normal,x.n),pct(x.special,x.n),pct(...x.repeat),pct(...x.returning),pct(...x.fromSpecial)]));
  out.innerHTML=header+'<p>正在读取该彩种投注留存…</p>';
  let betting=null,error='';
  if(['xa','gc'].includes(lot))try{betting=await BettingData71.normalEvidence(lot,source,DR.slice(),NEXT);}catch(e){error='投注留存暂时无法读取。';}
  if(!box.isConnected||lot!==CUR_LOT||source!==(UP.te_betting_source103||'A'))return;
  const reports=betting?.reports||[],active=reports.find(r=>r.slot===betting?.slot),items=active?.report.items||[];
  const bands=rankEvidence(items,gz,BettingAnalysis71.any),current=betting?.current;
  const early=reports.find(r=>r.slot==='20:30')?.report.items||[],late=reports.find(r=>r.slot==='21:00')?.report.items||[];
  const normalBaseline=z=>BettingAnalysis71.any(balls.filter(n=>gz(n)===z).length,6);
  const motion=movements(early,late,gz,normalBaseline);
  const amountMove=z=>{
    for(const m of motion.slice().reverse()){
      const a=shares(betting?.currentEarly,m.key),b=shares(betting?.currentLate,m.key);
      if(!a||!b)continue;
      const d=b.get(z)-a.get(z),group=m.groups[movementBand(d)];
      return {d,adjustment:m.n>=12&&group.n>=30?(group.normal-group.base)/(group.n+60):0};
    }
    return {d:null,adjustment:0};
  };
  const short=rows.slice(-12);
  const estimate=(z)=>{const s=stats.get(z),appeared=last?.n.some(n=>gz(n)===z),group=appeared?s.repeat:s.returning;
    const base=normalBaseline(z);
    const fx=stats.get(zodWx(z)),fxSeen=last?.n.some(n=>zodWx(gz(n))===zodWx(z)),fg=fxSeen?fx?.repeat:fx?.returning;
    const wxBase=BettingAnalysis71.any(balls.filter(n=>zodWx(gz(n))===zodWx(z)).length,6);
    return (group[0]-group[1]*base)/(group[1]+30)+0.25*(fg?(fg[0]-fg[1]*wxBase)/(fg[1]+30):0);};
  const flat=(current?.flatZodiacs||[]).map(x=>typeof x==='string'?x:x.z);
  const rankPart=(list,key,value)=>{const i=list?.indexOf(value)??-1;if(i<0||items.length<12)return 0;
    const a=bands[key][band(i,list.length)];return a.n>=30?(a.normal-a.base)/(a.n+60):0;};
  const candidates=pool.map(value=>{
    const z=game==='z3'?gz(value):value,seen=r=>game==='z3'?r.n.includes(value):r.n.some(n=>gz(n)===z);
    const hits=short.filter(seen).length,index=rows.findLastIndex(seen),gap=rows.length-1-index;
    const base=game==='z3'?6/49:normalBaseline(z);
    const hot=(hits-short.length*base)/(short.length+24),omission=Math.min(gap,8)/8;
    const rank=game==='z3'?rankPart(current?.numbers,'number',value):0;
    const independent=flat.length===12&&bands.flat.every(x=>x.n>=30);
    const zList=independent?flat:current?.zodiacs;
    const zodiacRank=rankPart(zList,independent?'flat':'zodiac',z),move=amountMove(z);
    return {value,z,hits,gap,move:move.d,rank:(zList?.indexOf(z)??-1)+1,score:50+100*(hot*0.55+estimate(z)*(game==='z3'?0.2:0.5)+rank*0.5+zodiacRank*0.35+move.adjustment*0.25)+omission};
  }).sort((a,b)=>b.score-a.score);
  const fit=candidates.slice(0,24).map(x=>String(x.value).padStart(game==='z3'?2:1,'0')).join('、');
  const limits=(UP.lx_grp_limits||[]).filter(rule=>ComboLimits.bounds(rule).valid);
  const ruleRows=game==='lx'?limits.map(rule=>{
    const members=(rule.zods||rule.pool).filter(z=>zodiac.includes(z)),{min,max}=ComboLimits.bounds(rule);
    const eligible=rows.filter(r=>{const d=String(r.date||r.d||'').replace('/','-');return (d.length===5?'2026-'+d:d)>='2026-02-17';});
    const counts=includeSpecial=>{const hits=eligible.map(r=>{const values=new Set((includeSpecial?r.n.concat(r.t):r.n).map(gz));return members.filter(z=>values.has(z)).length;});return [pct(hits.filter(n=>n>=min&&n<=max).length,hits.length),Array.from({length:members.length+1},(_,k)=>k+'肖 '+hits.filter(n=>n===k).length+'期').join(' · ')];};
    return [members.join('、'),ComboLimits.describe(rule),...counts(false),...counts(true)];
  }):[];
  const labels={number:'号码榜',zodiac:'生肖榜',flat:'独立平特榜'};
  out.innerHTML='<h4>当前范围内的参考排序</h4><p>按近12期正码热度、遗漏、平肖再出及生肖五行综合评分。遗漏最多加1分。榜单和金额变化有本期留存且同口径达到12期才参与加权。中特表现单列核对。</p>'
    +'<p>'+ (game==='z3'?'按评分最多保留24码':'当前可用生肖')+' 【'+(fit||'无')+'】 '+(fit?'<button type="button" data-copy-evidence121="'+fit+'">复制范围</button>':'')+'。评分供筛选，组合仍按当前限制验证。</p>'
    +table(['候选','生肖','近12期正码出现','当前遗漏期','生肖榜名次','占比变化','参考分'],candidates.map(x=>[x.value,x.z,x.hits,x.gap,x.rank||'—',x.move===null?'—':(100*x.move).toFixed(2)+'个百分点',x.score.toFixed(2)]))
    +(game==='lx'?'<p>若三肖设置最多取2，允许取0、1或2个。排序只供参考，组合生成仍逐组检查上限。</p>':'')
    +(ruleRows.length?'<h4>已设生肖组历史开出情况</h4>'+table(['生肖组','范围','平肖符合','平肖开出分布','七球符合','七球开出分布'],ruleRows):'')
    +'<h4>投注榜单 × 正码／平肖／特肖</h4><p>'+ (betting?source+'站 '+betting.slot+' · 已核对'+items.length+'期 · '+(current?'已有本期准点榜':'本期尚无合格的准点榜'):(error||'该彩种暂无独立投注榜资料。'))+'</p>'
    +table(['榜单分段','号码／生肖样本数','中正码／平肖','中特／特肖','正码同宽随机'],Object.entries(bands).flatMap(([k,v])=>v.map((a,i)=>[labels[k]+['前段','中段','后段'][i],a.n,pct(a.normal,a.n),pct(a.special,a.n),a.n?(100*a.base/a.n).toFixed(1)+'%':'—'])))
    +'<h4>20:30 → 21:00 生肖金额占比变化</h4><p>只计两个时点都齐全的同一期；按占比升、平、降分别核对平肖、特肖和七球出现。</p>'
    +table(['榜单','配对期数','占比变化','平肖','特肖','七球未见'],motion.flatMap(m=>m.groups.map((a,i)=>[m.key==='zodiacs'?'生肖榜':'独立平特榜',m.n,['升','近似不变','降'][i],pct(a.normal,a.n),pct(a.special,a.n),pct(a.n-a.seven,a.n)])))+header;
}
document.addEventListener('click',e=>{
  const copy=e.target.closest('[data-copy-evidence121]');
  if(copy){navigator.clipboard.writeText(copy.dataset.copyEvidence121).then(()=>showClickFeedback('已复制参考范围')).catch(()=>showClickFeedback('复制失败，请长按选择号码'));return;}
  const b=e.target.closest('[data-evidence121]');if(!b)return;
  b.disabled=true;
  show(b.closest('#normal-evidence121')).catch(()=>{const out=b.parentElement?.querySelector('[data-evidence-result121]');if(out)out.textContent='本次计算未完成，请重试。';}).finally(()=>{b.disabled=false;});
});
window.NormalEvidence121={panel};
})();
