(function(){
'use strict';

var VERSION='v10.1007.02',PAGE=0,CACHE={},RECONCILE_KEY='v10_1007_02_exact_cloud_boundary';
var RECONCILING=new Date().getTime()<=new Date('2026-10-08T23:59:59+08:00').getTime()&&localStorage.getItem(RECONCILE_KEY)!=='done';
function fmt(n){return String(n).padStart(2,'0');}
function C(n,k){if(k<0||k>n)return 0;var r=1;for(var i=1;i<=k;i++)r=r*(n-k+i)/i;return r;}
function zodOf(n){return gz(n);}
function drawZods(r){return Array.from(new Set(r.n.concat([r.t]).map(zodOf)));}
function normalZods(r){return Array.from(new Set(r.n.map(zodOf)));}
function rank01(obj){var a=A49.slice().sort(function(x,y){return obj[x]-obj[y]||x-y;}),o={};a.forEach(function(n,i){o[n]=i/48;});return o;}

// Supplied-file rows remain the historical boundary. New cloud rows may append
// only after the last supplied period; stale historical cloud rows cannot win.
if(typeof authoritativeRows==='function'){
  var oldMerge=mergeAuthoritativeSnapshot;
  mergeAuthoritativeSnapshot=function(lot,rows){
    var seed=authoritativeRows(lot).map(function(r){return {p:r.p,d:r.d,n:r.n.slice(),t:r.t};}),map={};
    seed.forEach(function(r){map[r.p]=r;});
    var max=seed.length?seed[seed.length-1].p:0;
    if(!RECONCILING)(rows||[]).forEach(function(r){if(r&&r.p>max&&validCloudRecord(lot,r))map[r.p]=r;});
    return Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return a.p-b.p;});
  };
}
function reconcileCloudBoundary(){
  if(!RECONCILING||!window.sb||typeof _upsertChunked!=='function')return Promise.resolve(false);
  var lots=['xa','la','gc'];
  return lots.reduce(function(chain,lot){return chain.then(function(){
    var seed=authoritativeRows(lot).map(function(r){return {p:r.p,d:r.d,n:r.n.slice(),t:r.t};}),keep={};seed.forEach(function(r){keep[r.p]=1;});
    var releaseMax=lot==='gc'?107:280;
    return sb.from('lottery_records').select('period,date,n1,n2,n3,n4,n5,n6,t').eq('lot_type',lot).order('period',{ascending:true}).then(function(res){
      if(res.error)throw new Error(res.error.message||'读取云端失败');
      var extras=(res.data||[]).map(function(r){return Number(r.period);}).filter(function(p){return p<=releaseMax&&!keep[p];});
      return _upsertChunked(seed.map(function(r){return recordCloudRow(lot,r);})).then(function(){
        var chunks=[];for(var i=0;i<extras.length;i+=50)chunks.push(extras.slice(i,i+50));
        return chunks.reduce(function(q,ps){return q.then(function(){return sb.from('lottery_records').delete().eq('lot_type',lot).in('period',ps).then(function(d){if(d.error)throw new Error(d.error.message);});});},Promise.resolve());
      });
    });
  });},Promise.resolve()).then(function(){
    localStorage.setItem(RECONCILE_KEY,'done');RECONCILING=false;CLOUD_SYNC={};DR=authoritativeRows(CUR_LOT).map(function(r){return {p:r.p,d:r.d,n:r.n.slice(),t:r.t};});calcDerived();render();return refreshFromServer();
  }).then(function(){showClickFeedback('✅ 三份文件边界已同步，旧伪期数已清理');return true;}).catch(function(e){console.error('[v10.1007.02 reconcile]',e);return false;});
}

var MODELS={
  frequency:{long:1,short:.35,omit:-.10},
  continuity:{long:.55,short:.15,sameZod:.45,sameTail:.20,repeat:-.20},
  complement:{long:.45,short:.10,zodComplement:.65,sameTail:.18,sameHead:.25,near12:.45,repeat:-.45},
  rebound:{long:.25,short:-.25,omit:.65,zodHot:-.20,repeat:-.25},
  hot:{long:.55,short:.55,zodHot:.25,tailHot:.10,repeat:-.15},
  hybrid:{long:.55,short:.15,omit:.10,zodComplement:.40,sameTail:.18,sameHead:.15,near12:.28,repeat:-.35,zodHot:.10}
};
var ENSEMBLES=[['frequency'],['continuity'],['complement'],['rebound'],['hot'],['hybrid'],['continuity','hybrid'],['frequency','continuity'],['continuity','complement','hybrid']];

function numberFeatures(hist){
  var last=hist[hist.length-1],lng=hist.slice(-60),sh=hist.slice(-8),lc={},sc={},om={},zr={},tr={},hr={};
  A49.forEach(function(n){lc[n]=0;sc[n]=0;});
  lng.forEach(function(r){r.n.forEach(function(n){lc[n]++;});});sh.forEach(function(r){r.n.forEach(function(n){sc[n]++;});});
  A49.forEach(function(n){var q=0;for(var i=hist.length-1;i>=0;i--){if(hist[i].n.indexOf(n)>=0)break;q++;}om[n]=Math.min(q,24);});
  hist.slice(-6).forEach(function(r){r.n.forEach(function(n){var z=zodOf(n),t=n%10,h=Math.floor(n/10);zr[z]=(zr[z]||0)+1;tr[t]=(tr[t]||0)+1;hr[h]=(hr[h]||0)+1;});});
  var lr=rank01(lc),sr=rank01(sc),orr=rank01(om),ls=new Set(last.n),lz=new Set(last.n.map(zodOf)),lt=new Set(last.n.map(function(n){return n%10;})),lh=new Set(last.n.map(function(n){return Math.floor(n/10);})),out={};
  A49.forEach(function(n){var near=99;last.n.forEach(function(x){near=Math.min(near,Math.abs(n-x));});out[n]={
    long:lr[n]-.5,short:sr[n]-.5,omit:orr[n]-.5,repeat:ls.has(n)?1:0,sameZod:lz.has(zodOf(n))?1:0,
    zodComplement:lz.has(zodOf(n))&&!ls.has(n)?1:0,sameTail:lt.has(n%10)?1:0,sameHead:lh.has(Math.floor(n/10))?1:0,
    near12:!ls.has(n)&&near<=2?1:0,zodHot:((zr[zodOf(n)]||0)-3)/6,tailHot:((tr[n%10]||0)-3.6)/6,headHot:((hr[Math.floor(n/10)]||0)-7.2)/8
  };});return out;
}
function rawRanks(hist,name){var f=numberFeatures(hist),w=MODELS[name],s={};A49.forEach(function(n){var v=0;Object.keys(f[n]).forEach(function(k){v+=(w[k]||0)*f[n][k];});s[n]=v;});return A49.slice().sort(function(a,b){return s[b]-s[a]||a-b;});}
function numberPool(hist,names,size,usePrefs){
  var agg={},zc={},hc={};A49.forEach(function(n){agg[n]=0;});
  names.forEach(function(name){rawRanks(hist,name).slice().reverse().forEach(function(n,i){agg[n]+=i/48;});});
  var allowed=A49.filter(function(n){return !usePrefs||typeof planZ3Allowed!=='function'||planZ3Allowed(n);}),out=[];
  allowed.sort(function(a,b){return agg[b]-agg[a]||a-b;}).forEach(function(n){if(out.length>=size)return;var z=zodOf(n),h=Math.floor(n/10);if((zc[z]||0)>=2||(hc[h]||0)>=3)return;out.push(n);zc[z]=(zc[z]||0)+1;hc[h]=(hc[h]||0)+1;});
  allowed.sort(function(a,b){return agg[b]-agg[a]||a-b;}).forEach(function(n){if(out.length<size&&out.indexOf(n)<0)out.push(n);});
  return out;
}
function z3Theory(size){var d=C(49,6),s=0;for(var k=3;k<=Math.min(6,size);k++)s+=C(size,k)*C(49-size,6-k);return s/d;}
function modelAudit(rows,names,limit){var start=Math.max(30,rows.length-(limit||70)),full=0,hits=0,detail=[];for(var i=start;i<rows.length;i++){var p=numberPool(rows.slice(0,i),names,8,false),hs=rows[i].n.filter(function(n){return p.indexOf(n)>=0;});full+=hs.length>=3?1:0;hits+=hs.length;detail.push({p:rows[i].p,d:rows[i].d,pool:p,hits:hs});}return {names:names,n:detail.length,full:full,hits:hits,mean:hits/Math.max(1,detail.length),detail:detail};}
function selectNumberModel(rows){
  var key=CUR_LOT+'|z3|'+rows.length;if(CACHE[key])return CACHE[key];
  var all=ENSEMBLES.map(function(e){return modelAudit(rows,e,70);});
  all.sort(function(a,b){var ar=(a.full+1)/(a.n+2),br=(b.full+1)/(b.n+2);return br-ar||b.mean-a.mean||a.names.length-b.names.length;});
  return CACHE[key]={best:all[0],all:all};
}

var LXMODELS={balanced:{long:.35,short:.22,prev:.30,omit:-.13,special:.10},continuity:{long:.25,short:.15,prev:.55,omit:-.05,special:.10},trend:{long:.25,short:.50,prev:.20,omit:-.05,special:.08},rebound:{long:.35,short:.15,prev:.20,omit:.30,special:.08}};
function lxPool(hist,name,usePrefs){
  var w=LXMODELS[name],last=hist[hist.length-1],prev=new Set(drawZods(last)),lng=hist.slice(-60),sh=hist.slice(-8),te=zodOf(last.t),score={};
  ZODS.forEach(function(z){var l=lng.filter(function(r){return drawZods(r).indexOf(z)>=0;}).length/Math.max(1,lng.length),s=sh.filter(function(r){return drawZods(r).indexOf(z)>=0;}).length/Math.max(1,sh.length),om=0;for(var i=hist.length-1;i>=0;i--){if(drawZods(hist[i]).indexOf(z)>=0)break;om++;}score[z]=w.long*l+w.short*s+w.prev*(prev.has(z)?1:0)+w.omit*Math.min(om,10)/10+w.special*(z===te?1:0);});
  var allowed=ZODS.filter(function(z){return !usePrefs||!(UP.lx_excl_zods||[]).includes(z);});return allowed.sort(function(a,b){return score[b]-score[a]||ZODS.indexOf(a)-ZODS.indexOf(b);}).slice(0,6);
}
function lxBase(u){return u<5?0:(C(u,5)*C(12-u,1)+C(u,6))/C(12,6);}
function lxAudit(rows,name,limit){var start=Math.max(30,rows.length-(limit||70)),full=0,hits=0,base=0,detail=[];for(var i=start;i<rows.length;i++){var p=lxPool(rows.slice(0,i),name,false),az=drawZods(rows[i]),hs=p.filter(function(z){return az.indexOf(z)>=0;});full+=hs.length>=5?1:0;hits+=hs.length;base+=lxBase(az.length);detail.push({p:rows[i].p,d:rows[i].d,pool:p,hits:hs,uniq:az.length});}return {name:name,n:detail.length,full:full,hits:hits,mean:hits/Math.max(1,detail.length),base:base/Math.max(1,detail.length),detail:detail};}
function selectLxModel(rows){var key=CUR_LOT+'|lx|'+rows.length;if(CACHE[key])return CACHE[key];var a=Object.keys(LXMODELS).map(function(n){return lxAudit(rows,n,70);});a.sort(function(x,y){return (y.full+1)/(y.n+2)-(x.full+1)/(x.n+2)||y.mean-x.mean;});return CACHE[key]={best:a[0],all:a};}

function structuralStats(rows){
  var defs=[['上期原号','repeat'],['同肖换号','zodComplement'],['上期同尾','sameTail'],['上期同头','sameHead'],['邻号±1/2','near12']],res={};defs.forEach(function(d){res[d[1]]={label:d[0],h:0,n:0};});
  for(var i=Math.max(12,rows.length-70);i<rows.length;i++){var f=numberFeatures(rows.slice(0,i)),actual=new Set(rows[i].n);A49.forEach(function(n){defs.forEach(function(d){if(f[n][d[1]]>0){res[d[1]].n++;if(actual.has(n))res[d[1]].h++;}});});}
  return defs.map(function(d){var x=res[d[1]],rate=x.h/Math.max(1,x.n),lift=rate/(6/49);return {label:x.label,h:x.h,n:x.n,rate:rate,lift:lift,use:x.n>=40&&Math.abs(lift-1)>=.08};});
}
function divStats(rows){return [3,4,5,7].map(function(d){var nums=A49.filter(function(n){return n%d===0;}),h=0,n=rows.length*6;rows.forEach(function(r){r.n.forEach(function(x){if(x%d===0)h++;});});var rate=h/n,base=nums.length/49;return {d:d,h:h,n:n,rate:rate,base:base,lift:rate/base};});}
function modelName(a){var m={frequency:'长期频率',continuity:'结构延续',complement:'同肖换号/邻号互补',rebound:'遗漏回补',hot:'短期热势',hybrid:'综合互补'};return a.map(function(x){return m[x]||x;}).join('＋');}

function z3Card(rows){
  var sel=selectNumberModel(rows),best=sel.best,p8=numberPool(rows,best.names,8,true),p13=numberPool(rows,best.names,13,true),base=z3Theory(8),rate=best.full/Math.max(1,best.n),st=structuralStats(rows),ds=divStats(rows),last=rows[rows.length-1],f=numberFeatures(rows),active={};
  st.forEach(function(x){active[x.label]=x.use;});
  function reason(n){var a=[];if(f[n].zodComplement&&active['同肖换号'])a.push('同肖换号');if(f[n].near12&&active['邻号±1/2'])a.push('邻号互补');if(f[n].sameTail&&active['上期同尾'])a.push('同尾');if(f[n].sameHead&&active['上期同头'])a.push('同头');if(f[n].repeat&&active['上期原号'])a.push('上期原号降权');if(!a.length)a.push(f[n].long>0?'长期频率较前':'分散补位');return a.slice(0,2).join('/');}
  var h='<div class="card" style="border:3px solid #1565c0;background:#f4f9ff"><h3 style="color:#1565c0">三中三 · 逐期留出验证模型</h3>';
  h+='<p>8码中至少3个正码的随机基线是 <b>'+ (100*base).toFixed(2)+'%</b>，平均命中数仅 <b>'+(48/49).toFixed(2)+'</b>。当前模型为 <b>'+modelName(best.names)+'</b>；最近'+best.n+'期留出回测 '+best.full+'/'+best.n+'（'+(100*rate).toFixed(1)+'%），平均命中 '+best.mean.toFixed(2)+' 个。'+(rate>base?'<b style="color:#1e8449">高于随机，但样本仍小</b>':'<b style="color:#c0392b">未胜随机，仅作缩小范围参考</b>')+'。</p>';
  h+='<p><b>本期8码：</b><span style="font-size:17px;color:#1565c0"> '+p8.map(fmt).join(' ')+'</span><br><small>'+p8.map(function(n){return fmt(n)+' '+reason(n);}).join('；')+'</small></p><p><b>扩展13码：</b>'+p13.map(fmt).join(' ')+'</p>';
  h+='<div style="overflow-x:auto"><table><tr><th>结构</th><th>样本命中/候选</th><th>相对随机</th><th>处理</th></tr>'+st.map(function(x){return '<tr><td>'+x.label+'</td><td>'+x.h+'/'+x.n+' ('+(100*x.rate).toFixed(1)+'%)</td><td>'+x.lift.toFixed(2)+'倍</td><td>'+(x.use?'进入轻量评分':'停用/只观察')+'</td></tr>';}).join('')+'</table></div>';
  h+='<p style="font-size:10px"><b>倍数关系核验：</b>'+ds.map(function(x){return x.d+'的倍数 '+x.lift.toFixed(2)+'倍';}).join('；')+'。这是总体分布检查，不直接当成下期必出条件。</p>';
  h+='<p style="font-size:10px"><b>反庄家处理：</b>“连续开出后人会认为下期不再开”属于可检验的延续/反转问题，系统直接比较两者的逐期命中率；没有真实投注人数与金额数据时，不把“大家都买所以不出”写入主评分。</p>';
  if(CUR_LOT==='gc')h+='<p style="background:#fff3e0;padding:6px;border-radius:5px"><b>103→104期实例：</b>103期正码43、45、46后，104期出现44、47、48，确属“同头邻号补位”。新模型把同头、邻号±1/2和同肖换号拆开回测；只有总体有提升时才加分，不因单个实例硬套。</p>';
  h+='<button class="btn btn-green" onclick="UP.zm3_pick_pool=['+p8.join(',')+'];saveData();render();showClickFeedback(\'已应用动态8码池\')">应用8码池</button> <button class="btn btn-blue" onclick="UP.zm3_pick_pool=['+p13.join(',')+'];saveData();render();showClickFeedback(\'已应用动态13码池\')">应用13码池</button></div>';
  return h;
}
function lxCombos(pool){var out=[];for(var i=0;i<pool.length;i++)out.push(pool.filter(function(_,j){return i!==j;}));return out;}
function lxCard(rows){var sel=selectLxModel(rows),b=sel.best,p=lxPool(rows,b.name,true),rate=b.full/Math.max(1,b.n),cs=lxCombos(p),last=rows[rows.length-1],prev=drawZods(last);return '<div class="card" style="border:3px solid #8e24aa;background:#faf3ff"><h3 style="color:#8e24aa">五连肖 · 六肖复式池</h3><p>按你的定义：只推荐 <b>6个生肖</b>，自动生成 C(6,5)=6组五连肖；命中条件是当期7个号码去重生肖与六肖池重合至少5个。当前模型 <b>'+b.name+'</b>，最近'+b.n+'期留出回测 '+b.full+'/'+b.n+'（'+(100*rate).toFixed(1)+'%），同期随机基线 '+(100*b.base).toFixed(1)+'%。</p><p><b>六肖池：</b><span style="font-size:18px;color:#8e24aa">'+p.join(' ')+'</span>；承接上期生肖 '+p.filter(function(z){return prev.indexOf(z)>=0;}).length+' 个。</p><p>'+cs.map(function(x,i){return '#'+(i+1)+' '+x.join('');}).join('　')+'</p><p style="font-size:10px">评分使用近60期出现率、近8期热度、上期延续、遗漏方向和上期特肖轻量补入。特肖强排除不会自动排除平肖；只有“连肖排除”才会移除该生肖。</p><button class="btn btn-green" onclick="UP.lx_pick_n_zods='+JSON.stringify(p).replace(/"/g,"'")+';UP.lx_pick_k_size=5;saveData();render();showClickFeedback(\'已应用六肖选五肖复式\')">应用六肖复式</button></div>';}
function auditCard(rows){var z=selectNumberModel(rows).best,l=selectLxModel(rows).best,zd=z.detail.slice().reverse(),ld=l.detail.slice().reverse(),pages=Math.max(1,Math.ceil(zd.length/10));PAGE=Math.max(0,Math.min(PAGE,pages-1));var a=zd.slice(PAGE*10,PAGE*10+10);var h='<div class="card"><h3>逐期三中三与六肖复式复盘</h3><p>每一期只使用此前开奖记录计算，没有偷看目标期。8码随机基线 '+(100*z3Theory(8)).toFixed(2)+'%；页面按期翻页。</p><button class="btn btn-gray" onclick="v100702Page('+(PAGE-1)+')" '+(PAGE===0?'disabled':'')+'>较新</button> 第'+(PAGE+1)+'/'+pages+'页 <button class="btn btn-gray" onclick="v100702Page('+(PAGE+1)+')" '+(PAGE>=pages-1?'disabled':'')+'>较早</button><div style="overflow-x:auto"><table><tr><th>期数</th><th>三中三8码</th><th>实际命中</th><th>六肖复式</th><th>命中肖</th></tr>';a.forEach(function(x,idx){var y=ld[PAGE*10+idx]||{pool:[],hits:[]};h+='<tr><td>'+x.p+'<br>'+x.d+'</td><td>'+x.pool.map(fmt).join(' ')+'</td><td style="color:'+(x.hits.length>=3?'#1e8449':'#c0392b')+'">中'+x.hits.length+'：'+x.hits.map(fmt).join(' ')+'</td><td>'+y.pool.join('')+'</td><td style="color:'+(y.hits.length>=5?'#1e8449':'#c0392b')+'">'+y.hits.length+'/6 '+y.hits.join('')+'</td></tr>';});return h+'</table></div></div>';}
window.v100702Page=function(p){PAGE=Math.max(0,p);render();};
function panel(tab){if(!DR||DR.length<31)return '';var h='<div data-v100702="1"></div>';if(tab==='zm3')return h+z3Card(DR)+auditCard(DR);if(tab==='lx')return h+lxCard(DR)+auditCard(DR);if(tab==='rec')return h+auditCard(DR);if(tab==='plan')return h+z3Card(DR)+lxCard(DR)+auditCard(DR);return h;}
function hideLegacyCards(el,tab){
  Array.from(el.querySelectorAll('.card')).forEach(function(card){var t=(card.textContent||'').replace(/\s+/g,'');
    if(tab==='zm3'&&(t.indexOf('动态数学建议')>=0||t.indexOf('动态主方案')>=0))card.style.display='none';
    if(tab==='lx'&&(t.indexOf('动态数学建议')>=0||t.indexOf('五连肖主推')>=0||t.indexOf('五连肖主选')>=0||t.indexOf('7肖复式池')>=0||t.indexOf('7肖覆盖池')>=0)&&t.indexOf('六肖复式池')<0)card.style.display='none';
  });
}
var core=window.render;window.render=function(){core();try{var el=document.getElementById('tabContent');if(el){hideLegacyCards(el,activeTab);el.insertAdjacentHTML('afterbegin',panel(activeTab));setTimeout(function(){hideLegacyCards(el,activeTab);},0);}}catch(e){console.error('[v10.1007.02]',e);}};
window.render();
setTimeout(reconcileCloudBoundary,300);
})();
