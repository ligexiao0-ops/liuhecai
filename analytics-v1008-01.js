(function(){
'use strict';

var VERSION='v10.1008.02',PAGE=0,CACHE={},CURRENT={};
function fmt(n){return String(n).padStart(2,'0');}
function C(n,k){if(k<0||k>n)return 0;var r=1;for(var i=1;i<=k;i++)r=r*(n-k+i)/i;return r;}
function zodOf(n){return gz(n);}
function drawZods(r){return Array.from(new Set(r.n.concat([r.t]).map(zodOf)));}
function rank01(obj){var a=A49.slice().sort(function(x,y){return obj[x]-obj[y]||x-y;}),o={};a.forEach(function(n,i){o[n]=i/48;});return o;}
function targetMeta(rows){var source=rows[rows.length-1];return {sourcePeriod:source.p,targetPeriod:source.p+1,targetDate:pToDate(source.p+1)};}
function isKnownRejected(lot,r){if(!r)return false;var nums=(r.n||[]).slice().sort(function(a,b){return a-b;}).join(',');return lot==='la'&&r.p===280&&nums==='3,21,26,33,42,45'&&Number(r.t)===22;}
function purgeKnownRejected(){if(!Array.isArray(DR))return false;var before=DR.length;DR=DR.filter(function(r){return !isKnownRejected(CUR_LOT,r);});if(before!==DR.length){if(UP){UP.z3l_history=(UP.z3l_history||[]).filter(function(r){return r.p!==280;});UP.lx5_history=(UP.lx5_history||[]).filter(function(r){return r.p!==280;});UP.v1008_forecasts=(UP.v1008_forecasts||[]).filter(function(r){return !(r.lot==='la'&&r.targetPeriod>280);});}try{saveData();}catch(e){}return true;}return false;}

// 用户提供的文件是已核对边界；云端只允许在边界之后追加，不能用旧云数据覆盖。
if(typeof authoritativeRows==='function'){
  mergeAuthoritativeSnapshot=function(lot,rows){
    var seed=authoritativeRows(lot).map(function(r){return {p:r.p,d:r.d,n:r.n.slice(),t:r.t};}),map={},max=0;
    seed.forEach(function(r){map[r.p]=r;max=Math.max(max,r.p);});
    (rows||[]).forEach(function(r){if(r&&r.p>max&&validCloudRecord(lot,r)&&!isKnownRejected(lot,r))map[r.p]=r;});
    return Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return a.p-b.p;});
  };
}

var MODELS={
  base:{long:.50,short:.20,omit:.08,zodComplement:.30,sameTail:.14,sameHead:.12,near12:.22,repeat:-.28,appeared6:.08},
  frequency:{long:.70,short:.22,omit:-.08,appeared6:.10},
  continuity:{long:.38,short:.18,sameZod:.36,sameTail:.20,repeat:-.18,appeared6:.14},
  complement:{long:.35,short:.08,zodComplement:.62,sameTail:.16,sameHead:.22,near12:.42,repeat:-.42,unseen6:.12},
  rebound:{long:.18,short:-.22,omit:.62,zodHot:-.18,repeat:-.22,unseen6:.20},
  hot:{long:.48,short:.55,zodHot:.22,tailHot:.10,repeat:-.12,appeared6:.20}
};
var ENSEMBLES=[['base'],['frequency'],['continuity'],['complement'],['rebound'],['hot'],['base','continuity'],['frequency','continuity'],['continuity','complement','base']];

function numberFeatures(hist){
  var last=hist[hist.length-1],lng=hist.slice(-60),sh=hist.slice(-8),six=hist.slice(-6),lc={},sc={},om={},zr={},tr={},hr={},seen6={};
  A49.forEach(function(n){lc[n]=0;sc[n]=0;seen6[n]=0;});
  lng.forEach(function(r){r.n.forEach(function(n){lc[n]++;});});
  sh.forEach(function(r){r.n.forEach(function(n){sc[n]++;});});
  six.forEach(function(r){r.n.forEach(function(n){seen6[n]=1;var z=zodOf(n),t=n%10,h=Math.floor(n/10);zr[z]=(zr[z]||0)+1;tr[t]=(tr[t]||0)+1;hr[h]=(hr[h]||0)+1;});});
  A49.forEach(function(n){var q=0;for(var i=hist.length-1;i>=0;i--){if(hist[i].n.indexOf(n)>=0)break;q++;}om[n]=Math.min(q,24);});
  var lr=rank01(lc),sr=rank01(sc),orr=rank01(om),ls=new Set(last.n),lz=new Set(last.n.map(zodOf)),lt=new Set(last.n.map(function(n){return n%10;})),lh=new Set(last.n.map(function(n){return Math.floor(n/10);})),out={};
  A49.forEach(function(n){var near=99;last.n.forEach(function(x){near=Math.min(near,Math.abs(n-x));});out[n]={
    long:lr[n]-.5,short:sr[n]-.5,omit:orr[n]-.5,repeat:ls.has(n)?1:0,sameZod:lz.has(zodOf(n))?1:0,
    zodComplement:lz.has(zodOf(n))&&!ls.has(n)?1:0,sameTail:lt.has(n%10)?1:0,sameHead:lh.has(Math.floor(n/10))?1:0,
    near12:!ls.has(n)&&near<=2?1:0,zodHot:((zr[zodOf(n)]||0)-3)/6,tailHot:((tr[n%10]||0)-3.6)/6,
    headHot:((hr[Math.floor(n/10)]||0)-7.2)/8,appeared6:seen6[n]?1:0,unseen6:seen6[n]?0:1
  };});return {f:out,longCount:lc,shortCount:sc,omit:om,seen6:seen6};
}
function rawRanks(hist,name){var pack=numberFeatures(hist),f=pack.f,w=MODELS[name],s={};A49.forEach(function(n){var v=0;Object.keys(f[n]).forEach(function(k){v+=(w[k]||0)*f[n][k];});s[n]=v;});return A49.slice().sort(function(a,b){return s[b]-s[a]||a-b;});}
function numberPool(hist,names,size,usePrefs){
  var agg={},zc={},hc={};A49.forEach(function(n){agg[n]=0;});
  names.forEach(function(name){rawRanks(hist,name).slice().reverse().forEach(function(n,i){agg[n]+=i/48;});});
  var allowed=A49.filter(function(n){return !usePrefs||typeof planZ3Allowed!=='function'||planZ3Allowed(n);}),out=[];
  allowed.sort(function(a,b){return agg[b]-agg[a]||a-b;}).forEach(function(n){if(out.length>=size)return;var z=zodOf(n),h=Math.floor(n/10);if((zc[z]||0)>=2||(hc[h]||0)>=3)return;out.push(n);zc[z]=(zc[z]||0)+1;hc[h]=(hc[h]||0)+1;});
  allowed.sort(function(a,b){return agg[b]-agg[a]||a-b;}).forEach(function(n){if(out.length<size&&out.indexOf(n)<0)out.push(n);});
  return out;
}
function z3Theory(size){var d=C(49,6),s=0;for(var k=3;k<=Math.min(6,size);k++)s+=C(size,k)*C(49-size,6-k);return s/d;}
function modelAudit(rows,names,limit){var start=Math.max(30,rows.length-(limit||70)),full=0,hits=0,detail=[];for(var i=start;i<rows.length;i++){var p=numberPool(rows.slice(0,i),names,8,false),hs=rows[i].n.filter(function(n){return p.indexOf(n)>=0;});full+=hs.length>=3?1:0;hits+=hs.length;detail.push({sourcePeriod:rows[i-1].p,targetPeriod:rows[i].p,d:rows[i].d,pool:p,hits:hs});}return {names:names,n:detail.length,full:full,hits:hits,mean:hits/Math.max(1,detail.length),detail:detail};}
function selectNumberModel(rows){var key=CUR_LOT+'|z3|'+rows.length;if(CACHE[key])return CACHE[key];var all=ENSEMBLES.map(function(e){return modelAudit(rows,e,70);});all.sort(function(a,b){return (b.full+1)/(b.n+2)-(a.full+1)/(a.n+2)||b.mean-a.mean;});return CACHE[key]={best:all[0],all:all};}

var LXMODELS={balanced:{long:.34,short:.22,prev:.30,omit:-.12,special:.08,chong:-.03},continuity:{long:.24,short:.14,prev:.58,omit:-.04,special:.08,chong:-.03},trend:{long:.22,short:.52,prev:.20,omit:-.04,special:.06,chong:-.03},rebound:{long:.32,short:.14,prev:.18,omit:.32,special:.06,chong:-.03}};
function lxPool(hist,name,usePrefs){
  var w=LXMODELS[name],last=hist[hist.length-1],prev=new Set(drawZods(last)),lng=hist.slice(-60),sh=hist.slice(-8),te=zodOf(last.t),meta=targetMeta(hist),chong=typeof getDayChong==='function'?getDayChong(meta.targetDate):'',score={};
  ZODS.forEach(function(z){var l=lng.filter(function(r){return drawZods(r).indexOf(z)>=0;}).length/Math.max(1,lng.length),s=sh.filter(function(r){return drawZods(r).indexOf(z)>=0;}).length/Math.max(1,sh.length),om=0;for(var i=hist.length-1;i>=0;i--){if(drawZods(hist[i]).indexOf(z)>=0)break;om++;}score[z]=w.long*l+w.short*s+w.prev*(prev.has(z)?1:0)+w.omit*Math.min(om,10)/10+w.special*(z===te?1:0)+w.chong*(z===chong?1:0);});
  var excl=usePrefs?(UP.lx_excl_zods||[]):[],force=usePrefs?(UP.lx_force_zods||[]):[],allowed=ZODS.filter(function(z){return excl.indexOf(z)<0;}),out=[];
  force.forEach(function(z){if(allowed.indexOf(z)>=0&&out.indexOf(z)<0&&out.length<6)out.push(z);});
  allowed.sort(function(a,b){return score[b]-score[a]||ZODS.indexOf(a)-ZODS.indexOf(b);}).forEach(function(z){if(out.length<6&&out.indexOf(z)<0)out.push(z);});return out;
}
function lxBase(u){return u<5?0:(C(u,5)*C(12-u,1)+C(u,6))/C(12,6);}
function lxAudit(rows,name,limit){var start=Math.max(30,rows.length-(limit||70)),full=0,hits=0,base=0,detail=[];for(var i=start;i<rows.length;i++){var p=lxPool(rows.slice(0,i),name,false),az=drawZods(rows[i]),hs=p.filter(function(z){return az.indexOf(z)>=0;});full+=hs.length>=5?1:0;hits+=hs.length;base+=lxBase(az.length);detail.push({sourcePeriod:rows[i-1].p,targetPeriod:rows[i].p,d:rows[i].d,pool:p,hits:hs,uniq:az.length});}return {name:name,n:detail.length,full:full,hits:hits,mean:hits/Math.max(1,detail.length),base:base/Math.max(1,detail.length),detail:detail};}
function selectLxModel(rows){var key=CUR_LOT+'|lx|'+rows.length;if(CACHE[key])return CACHE[key];var a=Object.keys(LXMODELS).map(function(n){return lxAudit(rows,n,70);});a.sort(function(x,y){return (y.full+1)/(y.n+2)-(x.full+1)/(x.n+2)||y.mean-x.mean;});return CACHE[key]={best:a[0],all:a};}

function structuralStats(rows){var defs=[['上期原号','repeat'],['同肖补位','zodComplement'],['上下期同尾','sameTail'],['上下期同头','sameHead'],['邻号±1/2','near12'],['近6期已出','appeared6'],['近6期未出','unseen6']],res={};defs.forEach(function(d){res[d[1]]={label:d[0],h:0,n:0};});for(var i=Math.max(12,rows.length-70);i<rows.length;i++){var f=numberFeatures(rows.slice(0,i)).f,actual=new Set(rows[i].n);A49.forEach(function(n){defs.forEach(function(d){if(f[n][d[1]]>0){res[d[1]].n++;if(actual.has(n))res[d[1]].h++;}});});}return defs.map(function(d){var x=res[d[1]],rate=x.h/Math.max(1,x.n),lift=rate/(6/49);return {label:x.label,h:x.h,n:x.n,rate:rate,lift:lift,use:x.n>=40&&Math.abs(lift-1)>=.08};});}
function modelName(a){var m={base:'原13码公式扩展',frequency:'常出次数',continuity:'同肖同尾延续',complement:'互补/邻号',rebound:'冷号遗漏回补',hot:'短期冷热'};return a.map(function(x){return m[x]||x;}).join('＋');}
function statExclude(hist){var pack=numberFeatures(hist),hot=A49.slice().sort(function(a,b){return pack.shortCount[b]-pack.shortCount[a]||a-b;}).slice(0,5),cold=A49.slice().sort(function(a,b){return pack.omit[b]-pack.omit[a]||a-b;}).slice(0,5);return {hot:hot,cold:cold,text:'热前5 '+hot.map(fmt).join(' ')+'；遗漏前5 '+cold.map(fmt).join(' ')};}

function ensureLedger(rows,p8,p13,lx){
  var m=targetMeta(rows);UP.v1008_forecasts=UP.v1008_forecasts||[];var old=UP.v1008_forecasts.find(function(x){return x&&x.lot===CUR_LOT&&x.targetPeriod===m.targetPeriod;});
  if(!old){old={lot:CUR_LOT,sourcePeriod:m.sourcePeriod,targetPeriod:m.targetPeriod,targetDate:m.targetDate,generatedAt:new Date().toISOString(),algorithmVersion:VERSION,z3_8:p8.slice(),z3_13:p13.slice(),lx6:lx.slice()};UP.v1008_forecasts.push(old);UP.v1008_forecasts=UP.v1008_forecasts.slice(-240);try{saveData();}catch(e){}}
  return old;
}
function currentAnalysis(rows){var zs=selectNumberModel(rows).best,ls=selectLxModel(rows).best,p8=numberPool(rows,zs.names,8,true),p13=numberPool(rows,zs.names,13,true),lx=lxPool(rows,ls.name,true),rec=ensureLedger(rows,p8,p13,lx),m=targetMeta(rows);if(UP.z3l_snapshot&&UP.z3l_snapshot.p===m.targetPeriod){UP.z3l_snapshot.targetPeriod=m.targetPeriod;UP.z3l_snapshot.sourcePeriod=m.sourcePeriod;UP.z3l_snapshot.targetDate=m.targetDate;UP.z3l_snapshot.algorithmVersion=VERSION;}if(UP.lx5_snapshot&&UP.lx5_snapshot.p===m.targetPeriod){UP.lx5_snapshot.targetPeriod=m.targetPeriod;UP.lx5_snapshot.sourcePeriod=m.sourcePeriod;UP.lx5_snapshot.targetDate=m.targetDate;UP.lx5_snapshot.algorithmVersion=VERSION;}CURRENT[CUR_LOT]={p8:p8,p13:p13,lx:lx,meta:m,zs:zs,ls:ls,rec:rec};return CURRENT[CUR_LOT];}
window.v1008Apply=function(kind){var x=CURRENT[CUR_LOT];if(!x)return;if(kind==='z3'){UP.zm3_pick_pool=x.p8.slice();x.rec.z3_8=x.p8.slice();x.rec.z3_13=x.p13.slice();}else{UP.lx_pick_n_zods=x.lx.slice();UP.lx_pick_k_size=5;x.rec.lx6=x.lx.slice();}x.rec.generatedAt=new Date().toISOString();x.rec.algorithmVersion=VERSION;saveData();render();showClickFeedback('✅ 已应用并锁定预测第'+x.meta.targetPeriod+'期');};

function z3Card(rows,x){var b=x.zs,base=z3Theory(8),rate=b.full/Math.max(1,b.n),st=structuralStats(rows),pack=numberFeatures(rows),ex=statExclude(rows),active={};st.forEach(function(q){active[q.label]=q.use;});function why(n){var f=pack.f[n],a=[];if(f.zodComplement)a.push('同肖补位');if(f.near12)a.push('邻号');if(f.sameTail)a.push('同尾');if(f.appeared6)a.push('近6已出');if(f.unseen6)a.push('近6未出');return a.slice(0,2).join('/')||'综合频次';}var h='<div class="card" style="border:3px solid #1565c0;background:#f4f9ff"><h3 style="color:#1565c0">三中三 · 预测第'+x.meta.targetPeriod+'期</h3><p><b>依据期：</b>'+x.meta.sourcePeriod+'期　<b>目标期：</b>'+x.meta.targetPeriod+'期（'+x.meta.targetDate+'）　<b>状态：</b>待开奖/待录入。第二天录入也仍核对'+x.meta.targetPeriod+'期。</p><p>在原8码/13码公式上加入冷热排名、出现次数、常出号码、近6期已出/未出、遗漏、同肖同尾和互补邻号。当前动态模型：<b>'+modelName(b.names)+'</b>；近'+b.n+'期逐期回测中三 '+b.full+'/'+b.n+'（'+(100*rate).toFixed(1)+'%），8码理论参照 '+(100*base).toFixed(2)+'%。</p>'+(x.p8.length<8?'<p class="warn">当前严格限制后只剩'+x.p8.length+'码，系统没有把已排除号码放回。请减少限制后再生成8码。</p>':'')+'<p><b>动态8码：</b><span style="font-size:18px;color:#1565c0"> '+x.p8.map(fmt).join(' ')+'</span><br><small>'+x.p8.map(function(n){return fmt(n)+' '+why(n);}).join('；')+'</small></p><p><b>扩展13码：</b>'+x.p13.map(fmt).join(' ')+'</p><p style="font-size:10px"><b>统计排除参考：</b>'+ex.text+'。这里只作降权参考；用户手动排除的号码/生肖会严格剔除，候选不足时明确提示，不偷偷放回。</p><div style="overflow-x:auto"><table><tr><th>规律</th><th>命中/候选</th><th>相对基础</th><th>本期使用</th></tr>'+st.map(function(q){return '<tr><td>'+q.label+'</td><td>'+q.h+'/'+q.n+'</td><td>'+q.lift.toFixed(2)+'倍</td><td>'+(q.use?'启用':'暂停/观察')+'</td></tr>';}).join('')+'</table></div><button class="btn btn-green" onclick="v1008Apply(\'z3\')" '+(x.p8.length<8?'disabled':'')+'>应用8码并锁定第'+x.meta.targetPeriod+'期</button></div>';return h;}
function lxCombos(pool){var out=[];for(var i=0;i<pool.length;i++)out.push(pool.filter(function(_,j){return i!==j;}));return out;}
function lxCard(rows,x){var b=x.ls,rate=b.full/Math.max(1,b.n),prev=drawZods(rows[rows.length-1]),chong=getDayChong(x.meta.targetDate),cs=lxCombos(x.lx);return '<div class="card" style="border:3px solid #8e24aa;background:#faf3ff"><h3 style="color:#8e24aa">五连肖 · 预测第'+x.meta.targetPeriod+'期</h3><p><b>依据期：</b>'+x.meta.sourcePeriod+'期　<b>目标期：</b>'+x.meta.targetPeriod+'期（'+x.meta.targetDate+'）　<b>当日冲肖：</b>'+chong+'（只作低权重参考）</p><p>当前6肖复式池：<span style="font-size:18px;color:#8e24aa"><b>'+x.lx.join(' ')+'</b></span>，生成 C(6,5)=6 组。与上期重复 '+x.lx.filter(function(z){return prev.indexOf(z)>=0;}).length+' 肖。模型 '+b.name+' 近'+b.n+'期命中5肖 '+b.full+'/'+b.n+'（'+(100*rate).toFixed(1)+'%）。</p><p>'+cs.map(function(q,i){return '#'+(i+1)+' '+q.join('');}).join('；')+'</p><p style="font-size:10px">权重动态比较长期次数、近8期热度、上期重合、遗漏回补、特肖和当日冲肖。手动“排除连肖生肖”会严格排除；特肖排除不会自动当作平肖排除。</p><button class="btn btn-green" onclick="v1008Apply(\'lx\')">应用6肖复式并锁定第'+x.meta.targetPeriod+'期</button></div>';}

function inclusionProb(zods){var k=zods.length,den=C(49,7),sum=0;for(var mask=0;mask<(1<<k);mask++){var removed=0,bits=0;for(var i=0;i<k;i++)if(mask&(1<<i)){removed+=(ZM[zods[i]]||[]).length;bits++;}sum+=(bits%2?-1:1)*C(49-removed,7);}return sum/den;}
function pct(v){return (100*v).toFixed(2)+'%';}
function moneyCard(rows,x){
  var zTheory=C(6,3)/C(49,3),zTickets=C(x.p8.length,3),zWins=0;x.zs.detail.forEach(function(r){zWins+=C(r.hits.length,3);});var zHist=x.zs.n&&zTickets?zWins*650/(x.zs.n*zTickets):0;
  var lx5=lxCombos(x.lx),lxTheory=lx5.length?lx5.reduce(function(s,c){return s+inclusionProb(c);},0)/lx5.length:0,lxWins=0;x.ls.detail.forEach(function(r){lxWins+=C(r.hits.length,5);});var lxHist=x.ls.n&&lx5.length?lxWins*100/(x.ls.n*lx5.length):0;
  var horse=ZODS.filter(function(z){return (ZM[z]||[]).length===5;})[0]||'',single4=1-C(45,7)/C(49,7),single5=1-C(44,7)/C(49,7);
  var items=[
    ['特码单号','45倍',1/49,45/49,'每个号码1注'],
    ['三中三单组','650倍',zTheory,650*zTheory,'8码='+zTickets+'组；13码=286组'],
    ['二中二单组','60倍',C(6,2)/C(49,2),60*C(6,2)/C(49,2),'每对号码1注'],
    ['特串单组','140倍',1/392,140/392,'1个正码＋1个特码'],
    ['三连肖单组','10倍',inclusionProb(x.lx.slice(0,3)),10*inclusionProb(x.lx.slice(0,3)),'所选3肖均在7个开奖号出现'],
    ['四连肖单组','30倍',inclusionProb(x.lx.slice(0,4)),30*inclusionProb(x.lx.slice(0,4)),'所选4肖均出现'],
    ['五连肖单组','100倍',lxTheory,100*lxTheory,'当前6肖拆成6组'],
    ['单肖（4码肖）','2倍',single4,2*single4,'平肖或特肖出现即中'],
    ['单肖（5码肖'+(horse?'：'+horse:'')+'）','2倍',single5,2*single5,'需先确认平台规则/限额']
  ];
  var h='<div class="card" style="border:3px solid #c0392b;background:#fff8f6"><h3 style="color:#c0392b">赔率、组合成本与回报校验</h3><p><b>计算口径：</b>暂按你给的倍数是“含本金总返还倍数”。理论概率按49号中不放回开6个正码＋1个特码计算。若平台写的是净赢倍数，结果要改。</p><div style="overflow-x:auto"><table><tr><th>玩法</th><th>返还</th><th>理论命中率</th><th>每投1元理论返还</th><th>组合成本/说明</th></tr>'+items.map(function(it){var ok=it[3]>1;return '<tr><td>'+it[0]+'</td><td>'+it[1]+'</td><td>'+pct(it[2])+'</td><td style="color:'+(ok?'#1e8449':'#c0392b')+'"><b>'+it[3].toFixed(3)+'元</b></td><td>'+it[4]+'</td></tr>';}).join('')+'</table></div>';
  h+='<p><b>当前动态方案的历史资金复盘：</b>三中三8码按每组三码各1元，近'+x.zs.n+'期每投1元返还 <b>'+zHist.toFixed(3)+'元</b>；五连肖6肖复式按6组各1元，近'+x.ls.n+'期每投1元返还 <b>'+lxHist.toFixed(3)+'元</b>。这两项是样本内选择后的结果，会偏乐观，不能当未来收益保证。</p>';
  h+='<p style="background:#fff3cd;padding:7px"><b>下注指导：</b>只在“平台规则已核对、限制后方案已锁定、历史逐期回报与理论回报都高于1”时才进入小额观察；其余显示为不下注。当前赔率下，特码、三中三、二中二、特串和平均连肖组合的理论返还均低于1。5码生肖的计算看似高于1，通常意味着平台规则、赔付定义或限额还有未计入条件，核对前不作为盈利方案。</p></div>';return h;
}

function savedRows(){var arr=(UP.v1008_forecasts||[]).filter(function(x){return x&&x.lot===CUR_LOT;}).slice().sort(function(a,b){return b.targetPeriod-a.targetPeriod;});return arr;}
function auditCard(rows,x){var zd=x.zs.detail.slice().reverse(),ld=x.ls.detail.slice().reverse(),saved=savedRows(),pending=saved.find(function(r){return r.targetPeriod===x.meta.targetPeriod;}),pages=Math.max(1,Math.ceil(zd.length/10));PAGE=Math.max(0,Math.min(PAGE,pages-1));var a=zd.slice(PAGE*10,PAGE*10+10),offset=PAGE*10,h='<div class="card"><h3>预测目标期复盘＋统计排除（可翻页）</h3><p style="background:#fff3cd;padding:7px"><b>期数规则：</b>推荐记录固定绑定目标期。'+x.meta.sourcePeriod+'期数据生成'+x.meta.targetPeriod+'期预测；只有录入'+x.meta.targetPeriod+'期开奖后才核对。当前'+(pending?'已保存该预测':'尚未保存')+'，未录入不算失败，也不会冒充下一期。</p><button class="btn btn-gray" onclick="v1008Page('+(PAGE-1)+')" '+(PAGE===0?'disabled':'')+'>上一页</button> 第'+(PAGE+1)+'/'+pages+'页 <button class="btn btn-gray" onclick="v1008Page('+(PAGE+1)+')" '+(PAGE>=pages-1?'disabled':'')+'>下一页</button><div style="overflow-x:auto"><table><tr><th>依据→目标</th><th>三中三8码</th><th>实际命中</th><th>统计排除参考</th><th>连肖6池</th><th>命中肖</th></tr>';a.forEach(function(q,idx){var y=ld[offset+idx]||{pool:[],hits:[]},cut=rows.findIndex(function(r){return r.p===q.targetPeriod;}),ex=cut>0?statExclude(rows.slice(0,cut)):{text:'-'};h+='<tr><td>'+q.sourcePeriod+' → <b>'+q.targetPeriod+'</b><br>'+q.d+'</td><td>'+q.pool.map(fmt).join(' ')+'</td><td style="color:'+(q.hits.length>=3?'#1e8449':'#c0392b')+'">中'+q.hits.length+'：'+q.hits.map(fmt).join(' ')+'</td><td style="font-size:9px">'+ex.text+'</td><td>'+y.pool.join('')+'</td><td style="color:'+(y.hits.length>=5?'#1e8449':'#c0392b')+'">'+y.hits.length+'/6 '+y.hits.join('')+'</td></tr>';});return h+'</table></div></div>';}
window.v1008Page=function(p){PAGE=Math.max(0,p);render();};
function panel(tab){if(!DR||DR.length<31)return '';var x=currentAnalysis(DR),h='<div data-v100801="1"></div>';if(tab==='zm3')return h+z3Card(DR,x)+moneyCard(DR,x)+auditCard(DR,x);if(tab==='lx')return h+lxCard(DR,x)+moneyCard(DR,x)+auditCard(DR,x);if(tab==='te')return h+moneyCard(DR,x);if(tab==='rec'||tab==='rev')return h+auditCard(DR,x);if(tab==='plan')return h+z3Card(DR,x)+lxCard(DR,x)+moneyCard(DR,x)+auditCard(DR,x);return h;}
function hideLegacyCards(el,tab){Array.from(el.querySelectorAll('.card')).forEach(function(card){if(card.closest('[data-v100801]'))return;var t=(card.textContent||'').replace(/\s+/g,'');if(tab==='zm3'&&(t.indexOf('动态数学')>=0||t.indexOf('严格回测')>=0))card.style.display='none';if(tab==='lx'&&(t.indexOf('动态数学')>=0||t.indexOf('九肖')>=0||t.indexOf('7肖复式')>=0))card.style.display='none';});}
var core=window.render;window.render=function(){purgeKnownRejected();core();try{var el=document.getElementById('tabContent');if(el){hideLegacyCards(el,activeTab);el.insertAdjacentHTML('afterbegin',panel(activeTab));}}catch(e){console.error('[v10.1008.02]',e);}};
window.render();
})();
