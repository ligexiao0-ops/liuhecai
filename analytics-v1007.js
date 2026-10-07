(function(){
'use strict';

var V1007_VERSION='v10.1007.01';
var V1007_MIGRATION='v10_1007_exact_files_cloud_v1';
var V1007_PAGE=0;
var V1007_CACHE={};

function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function fmt(n){return String(n).padStart(2,'0');}
function copyRows(lot){return authoritativeRows(lot).map(function(r){return {p:r.p,d:r.d,n:r.n.slice(),t:r.t};});}
function seedMax(lot){var a=authoritativeRows(lot);return a.length?a[a.length-1].p:0;}
function exactSeedRow(lot,r){return authoritativeRows(lot).some(function(x){return x.p===r.p&&recordSignature(x)===recordSignature(r);});}

// The three supplied files are the release boundary.  Old cloud rows outside
// those files are purged once; records entered after a successful migration are
// then allowed to append normally.
window.V1007_MIGRATING=localStorage.getItem(V1007_MIGRATION)!=='done';
var oldValid=validCloudRecord;
validCloudRecord=function(lot,r){return exactSeedRow(lot,r)||oldValid(lot,r);};
mergeAuthoritativeSnapshot=function(lot,rows){
  var seed=copyRows(lot),map={};seed.forEach(function(r){map[r.p]=r;});
  if(!window.V1007_MIGRATING)(rows||[]).forEach(function(r){if(r&&r.p>seedMax(lot)&&validCloudRecord(lot,r))map[r.p]=r;});
  return Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return a.p-b.p;});
};
cloudMerge=function(lot,local,server){
  var s=cloudState(lot),map={};mergeAuthoritativeSnapshot(lot,local).forEach(function(r){map[r.p]=r;});
  if(!window.V1007_MIGRATING)(server||[]).forEach(function(r){if(validCloudRecord(lot,r)&&r.p>seedMax(lot)&&!s.pending[r.p])map[r.p]=r;});
  copyRows(lot).forEach(function(r){map[r.p]=r;});
  Object.keys(s.pending).forEach(function(k){map[k]=s.pending[k];});
  return Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return a.p-b.p;});
};

function migrateCloud(){
  if(!window.V1007_MIGRATING||!window.sb)return Promise.resolve(false);
  var lots=['xa','la','gc'];
  return lots.reduce(function(chain,lot){return chain.then(function(){
    return sb.from('lottery_records').select('period,date,n1,n2,n3,n4,n5,n6,t').eq('lot_type',lot).order('period',{ascending:true}).then(function(res){
      if(res.error)throw new Error(res.error.message||'读取云端失败');
      var before=res.data||[],seed=copyRows(lot),keep={};seed.forEach(function(r){keep[r.p]=1;});
      try{localStorage.setItem('_cloud_backup_'+lot+'_20261007',JSON.stringify(before));}catch(e){}
      return _upsertChunked(seed.map(function(r){return recordCloudRow(lot,r);})).then(function(){
        var extras=before.map(function(r){return Number(r.period);}).filter(function(p){return !keep[p];}),chunks=[];
        for(var i=0;i<extras.length;i+=50)chunks.push(extras.slice(i,i+50));
        return chunks.reduce(function(q,ps){return q.then(function(){return sb.from('lottery_records').delete().eq('lot_type',lot).in('period',ps).then(function(d){if(d.error)throw new Error(d.error.message);});});},Promise.resolve());
      });
    });
  });},Promise.resolve()).then(function(){
    localStorage.setItem(V1007_MIGRATION,'done');window.V1007_MIGRATING=false;CLOUD_SYNC={};
    DR=copyRows(CUR_LOT);cacheCloudRows(CUR_LOT,DR);calcDerived();render();return refreshFromServer();
  }).then(function(){showClickFeedback('✅ 三份文件已覆盖旧云端，多余旧期已清理');return true;}).catch(function(e){
    console.error('[v10.1007 cloud migration]',e);window.V1007_MIGRATING=true;
    DR=copyRows(CUR_LOT);calcDerived();render();return false;
  });
}

// Exact dates for supplied rows; future Hong Kong dates are projected only for
// the next-entry prompt and never materialised as draw records.
var oldPToDate=pToDateByBase;
pToDateByBase=function(p){
  var seed=authoritativeRows(CUR_LOT),hit=seed.find(function(r){return r.p===Number(p);});
  if(hit)return hit.d;
  if(CUR_LOT!=='gc')return oldPToDate(p);
  var last=seed[seed.length-1],d=parseRecordDate('2026/'+last.d),q=last.p;
  while(q<Number(p)){d=nextDrawDate(d);q++;}
  return String(d.getMonth()+1).padStart(2,'0')+'/'+String(d.getDate()).padStart(2,'0');
};
pToDate=function(p){return pToDateByBase(p);};
var oldPeriodForDate=periodForRecordDate;
periodForRecordDate=function(v){
  var d=canonicalRecordDate(v),hit=authoritativeRows(CUR_LOT).find(function(r){return r.d===d;});
  if(hit)return hit.p;
  if(CUR_LOT!=='gc')return oldPeriodForDate(v);
  var dt=parseRecordDate(v),seed=authoritativeRows('gc'),last=seed[seed.length-1],cur=parseRecordDate('2026/'+last.d),p=last.p;
  if(!dt||dt<=cur)return null;
  while(cur<dt){cur=nextDrawDate(cur);p++;}
  return cur.getTime()===dt.getTime()?p:null;
};

function drawZods(r){return Array.from(new Set(r.n.concat([r.t]).map(gz)));}
function med(a){var b=a.slice().sort(function(x,y){return x-y;});return b.length?b[Math.floor(b.length/2)]:0;}
function choose(n,k){if(k<0||k>n)return 0;var r=1;for(var i=1;i<=k;i++)r=r*(n-k+i)/i;return r;}

var ZPROFILES={
  balanced:{long:.35,short:.25,trans:.30,omit:.10,omitDir:-1},
  trend:{long:.20,short:.50,trans:.25,omit:.05,omitDir:-1},
  transition:{long:.20,short:.15,trans:.60,omit:.05,omitDir:-1},
  rebound:{long:.30,short:.15,trans:.25,omit:.30,omitDir:1}
};
var NPROFILES={
  balanced:{long:.42,short:.20,repeat:.12,zprev:.18,omit:.08,omitDir:-1},
  stable:{long:.55,short:.12,repeat:.12,zprev:.16,omit:.05,omitDir:-1},
  overlap:{long:.28,short:.15,repeat:.24,zprev:.28,omit:.05,omitDir:-1},
  rebound:{long:.32,short:.12,repeat:.08,zprev:.18,omit:.30,omitDir:1}
};
var LPROFILES={
  balanced:{long:.35,short:.22,prev:.30,omit:.13,omitDir:-1},
  continuity:{long:.25,short:.15,prev:.55,omit:.05,omitDir:-1},
  trend:{long:.25,short:.50,prev:.20,omit:.05,omitDir:-1},
  rebound:{long:.35,short:.15,prev:.20,omit:.30,omitDir:1}
};

function zodRanks(hist,profile,all){
  var w=ZPROFILES[profile]||ZPROFILES.balanced,last=hist[hist.length-1],from=last?(all?drawZods(last):[gz(last.t)]):[],long=hist.slice(-60),short=hist.slice(-12),out=[];
  ZODS.forEach(function(z){
    var lc=long.filter(function(r){return (all?drawZods(r):[gz(r.t)]).indexOf(z)>=0;}).length/Math.max(1,long.length);
    var sc=short.filter(function(r){return (all?drawZods(r):[gz(r.t)]).indexOf(z)>=0;}).length/Math.max(1,short.length),tc=1,tt=12;
    for(var i=1;i<hist.length;i++){
      var prev=all?drawZods(hist[i-1]):[gz(hist[i-1].t)],cur=all?drawZods(hist[i]):[gz(hist[i].t)];
      if(prev.some(function(q){return from.indexOf(q)>=0;})){tt++;if(cur.indexOf(z)>=0)tc++;}
    }
    var om=0;for(var j=hist.length-1;j>=0;j--){if((all?drawZods(hist[j]):[gz(hist[j].t)]).indexOf(z)>=0)break;om++;}
    var os=(w.omitDir>0?Math.min(om,12)/12:1-Math.min(om,12)/12);
    out.push({z:z,s:w.long*lc+w.short*sc+w.trans*(tc/tt)+w.omit*os,om:om});
  });
  return out.sort(function(a,b){return b.s-a.s||ZODS.indexOf(a.z)-ZODS.indexOf(b.z);});
}
function numberRanks(hist,profile){
  var w=NPROFILES[profile]||NPROFILES.balanced,last=hist[hist.length-1],lset=new Set(last?last.n:[]),lz=new Set(last?last.n.map(gz):[]),long=hist.slice(-60),short=hist.slice(-8),out=[];
  A49.forEach(function(n){
    var lc=long.filter(function(r){return r.n.indexOf(n)>=0;}).length/Math.max(1,long.length),sc=short.filter(function(r){return r.n.indexOf(n)>=0;}).length/Math.max(1,short.length),om=0;
    for(var i=hist.length-1;i>=0;i--){if(hist[i].n.indexOf(n)>=0)break;om++;}
    var os=w.omitDir>0?Math.min(om,12)/12:1-Math.min(om,12)/12;
    out.push({n:n,s:w.long*lc+w.short*sc+w.repeat*(lset.has(n)?1:0)+w.zprev*(lz.has(gz(n))?1:0)+w.omit*os});
  });
  return out.sort(function(a,b){return b.s-a.s||a.n-b.n;});
}
function lxRanks(hist,profile){
  var w=LPROFILES[profile]||LPROFILES.balanced,last=hist[hist.length-1],prev=new Set(last?drawZods(last):[]),long=hist.slice(-60),short=hist.slice(-8),out=[];
  ZODS.forEach(function(z){
    var lc=long.filter(function(r){return drawZods(r).indexOf(z)>=0;}).length/Math.max(1,long.length),sc=short.filter(function(r){return drawZods(r).indexOf(z)>=0;}).length/Math.max(1,short.length),om=0;
    for(var i=hist.length-1;i>=0;i--){if(drawZods(hist[i]).indexOf(z)>=0)break;om++;}
    var os=w.omitDir>0?Math.min(om,10)/10:1-Math.min(om,10)/10;
    out.push({z:z,s:w.long*lc+w.short*sc+w.prev*(prev.has(z)?1:0)+w.omit*os});
  });
  return out.sort(function(a,b){return b.s-a.s||ZODS.indexOf(a.z)-ZODS.indexOf(b.z);});
}

function chooseProfile(hist,type){
  var names=Object.keys(type==='z3'?NPROFILES:type==='lx'?LPROFILES:ZPROFILES),start=Math.max(25,hist.length-18),best=null;
  names.forEach(function(name){var full=0,hits=0,n=0;
    for(var i=start;i<hist.length;i++){
      var h=hist.slice(0,i),actual=hist[i];n++;
      if(type==='special'){
        var z=zodRanks(h,name,false).slice(0,3).map(function(x){return x.z;});full+=z.indexOf(gz(actual.t))>=0?1:0;
      }else if(type==='z3'){
        var ns=numberRanks(h,name).slice(0,8).map(function(x){return x.n;}),c=actual.n.filter(function(x){return ns.indexOf(x)>=0;}).length;hits+=c;if(c>=3)full++;
      }else{
        var zs=lxRanks(h,name).slice(0,5).map(function(x){return x.z;}),az=drawZods(actual),c2=zs.filter(function(z){return az.indexOf(z)>=0;}).length;hits+=c2;if(c2===5)full++;
      }
    }
    var score=(full*10+hits)/Math.max(1,n),row={name:name,score:score,full:full,hits:hits,n:n};if(!best||row.score>best.score)best=row;
  });
  return best||{name:names[0],score:0,full:0,hits:0,n:0};
}

var ATTRS=[
  {k:'size',l:'大小',fn:gsz,vals:['大','小']},{k:'parity',l:'单双',fn:gpar,vals:['单','双']},
  {k:'sum',l:'合数单双',fn:ghe,vals:['合单','合双']},{k:'family',l:'家野',fn:gfam,vals:['家','野']},
  {k:'wave',l:'波色',fn:gwv,vals:['红','蓝','绿']},{k:'element',l:'五行',fn:gwx,vals:['金','木','水','火','土']},
  {k:'tail',l:'尾数',fn:function(n){return n%10;},vals:[0,1,2,3,4,5,6,7,8,9]},
  {k:'zod',l:'生肖',fn:gz,vals:ZODS}
];
function attrExclude(hist,d){
  var prev=d.fn(hist[hist.length-1].t),counts={};d.vals.forEach(function(v){counts[v]=1;});
  for(var i=1;i<hist.length;i++)if(d.fn(hist[i-1].t)===prev)counts[d.fn(hist[i].t)]++;
  hist.slice(-30).forEach(function(r){counts[d.fn(r.t)]+=.35;});
  return d.vals.slice().sort(function(a,b){return counts[a]-counts[b]||String(a).localeCompare(String(b));})[0];
}

function buildAudit(rows){
  var key=CUR_LOT+'|'+rows.length+'|'+(rows.length?recordSignature(rows[rows.length-1]):'');if(V1007_CACHE.audit&&V1007_CACHE.audit.key===key)return V1007_CACHE.audit.value;
  var out=[],start=Math.max(30,rows.length-70);
  for(var i=start;i<rows.length;i++){
    var hist=rows.slice(0,i),target=rows[i],zp=chooseProfile(hist,'special'),np=chooseProfile(hist,'z3'),lp=chooseProfile(hist,'lx');
    var zr=zodRanks(hist,zp.name,false),must=zr.slice(0,3).map(function(x){return x.z;}),kill=zr.slice(-3).map(function(x){return x.z;}),actualZ=gz(target.t);
    var rankedNums=numberRanks(hist,np.name),n8=rankedNums.slice(0,8).map(function(x){return x.n;}),n13=rankedNums.slice(0,13).map(function(x){return x.n;}),nHits=target.n.filter(function(n){return n8.indexOf(n)>=0;}),n13Hits=target.n.filter(function(n){return n13.indexOf(n)>=0;});
    var l5=lxRanks(hist,lp.name).slice(0,5).map(function(x){return x.z;}),az=drawZods(target),lHits=l5.filter(function(z){return az.indexOf(z)>=0;});
    var exclusions=ATTRS.map(function(d){var v=attrExclude(hist,d);return {l:d.l,v:v,ok:d.fn(target.t)!==v};});
    out.push({p:target.p,d:target.d,actual:target.t,z:actualZ,must:must,kill:kill,mustOk:must.indexOf(actualZ)>=0,killOk:kill.indexOf(actualZ)<0,n8:n8,n13:n13,nHits:nHits,n13Hits:n13Hits,l5:l5,lHits:lHits,attrs:exclusions,zp:zp.name,np:np.name,lp:lp.name,uniq:az.length});
  }
  V1007_CACHE.audit={key:key,value:out};return out;
}

function currentModels(rows){
  var key=CUR_LOT+'|models|'+rows.length+'|'+(rows.length?recordSignature(rows[rows.length-1]):'');if(V1007_CACHE.models&&V1007_CACHE.models.key===key)return V1007_CACHE.models.value;
  var v={zp:chooseProfile(rows,'special'),np:chooseProfile(rows,'z3'),lp:chooseProfile(rows,'lx')};V1007_CACHE.models={key:key,value:v};return v;
}
function applyValidatedWeights(rows){
  var m=currentModels(rows),key=CUR_LOT+'|'+LAST.p+'|'+m.np.name+'|'+m.lp.name;if(localStorage.getItem('_v1007_weight_key')===key)return m;
  var z={z3_w1:.4,z3_w2:1.2,z3_w3:.6,z3_w4:.4,z3_w5:.3,z3_w6:.3,z3_w7:.8,z3_w8:1.3,z3_w9:0};
  if(m.np.name==='stable'){z.z3_w1=.8;z.z3_w8=.9;}if(m.np.name==='overlap'){z.z3_w2=1.5;z.z3_w3=1;z.z3_w7=1;}if(m.np.name==='rebound'){z.z3_w8=1.6;z.z3_w1=.25;}
  var l={lx_w1:1.4,lx_w2:.4,lx_w3:.6,lx_w4:0,lx_w5:.2,lx_w6:1,lx_w7:0,lx_w8:.8,lx_w9:.5,lx_w10:.8};
  if(m.lp.name==='continuity'){l.lx_w1=1.2;l.lx_w8=1.1;l.lx_w9=.8;}if(m.lp.name==='trend'){l.lx_w1=1.5;l.lx_w10=1.1;}if(m.lp.name==='rebound'){l.lx_w3=1.2;l.lx_w5=.6;l.lx_w9=.2;}
  Object.keys(z).forEach(function(k){SCORE_W[k]=z[k];});Object.keys(l).forEach(function(k){SCORE_W[k]=l[k];});SCORE_W.te_w3=0;
  localStorage.setItem('_score_weights',JSON.stringify(SCORE_W));localStorage.setItem('_v1007_weight_key',key);return m;
}

function dataCard(){
  var seed=authoritativeRows(CUR_LOT),bad=seed.filter(function(r){return new Set(r.n.concat([r.t])).size!==7;});
  return '<div class="card" style="border:3px solid #1565c0;background:#eef6ff"><b style="color:#1565c0">📅 数据基准 '+V1007_VERSION+'</b><br>'+esc(LOTTERIES[CUR_LOT].name)+'以用户文件为准：'+seed[0].p+'—'+seed[seed.length-1].p+'期，最新 '+seed[seed.length-1].d+'。今天 '+new Date().toLocaleDateString('zh-CN')+'；预测期 '+(seed[seed.length-1].p+1)+'。'+(CUR_LOT==='gc'?'港彩日期采用实际开奖日；103期09/22、104期09/26、09/29停开、105期10/03、106期10/06。':'')+(bad.length?'<br><span style="color:#b45309">附件原值中 '+bad.length+' 期存在同期开奖重复号码：'+bad.map(function(r){return r.p;}).join('、')+'期。系统保留原文件并标风险，不再自行猜号修补。</span>':'')+(window.V1007_MIGRATING?'<br><span style="color:#c0392b">旧云端正在清理；清理完成前只显示三份文件，不采用多出的旧期。</span>':'')+'</div>';
}

function commonNumberCard(rows){
  var win=rows.slice(-Math.min(100,rows.length)),nc={},tc={};A49.forEach(function(n){nc[n]=0;tc[n]=0;});win.forEach(function(r){r.n.forEach(function(n){nc[n]++;});tc[r.t]++;});
  var body=ZODS.map(function(z){var nums=(ZM[z]||[]).slice(),zn=nums.slice().sort(function(a,b){return nc[b]-nc[a]||a-b;}).slice(0,3),zt=nums.slice().sort(function(a,b){return tc[b]-tc[a]||a-b;}).slice(0,2);return '<tr><td>'+EMJ[z]+z+'</td><td>'+zn.map(function(n){return fmt(n)+'('+nc[n]+')';}).join('、')+'</td><td>'+zt.map(function(n){return fmt(n)+'('+tc[n]+')';}).join('、')+'</td><td>'+nums.map(function(n){var nr=nc[n]/Math.max(1,6*win.length),tr=tc[n]/Math.max(1,win.length);return {n:n,r:nr-tr};}).sort(function(a,b){return b.r-a.r;}).slice(0,1).map(function(x){return fmt(x.n)+'偏正码';}).join('')+' / '+nums.map(function(n){var nr=nc[n]/Math.max(1,6*win.length),tr=tc[n]/Math.max(1,win.length);return {n:n,r:tr-nr};}).sort(function(a,b){return b.r-a.r;})[0].n.toString().padStart(2,'0')+'偏特码</td></tr>';}).join('');
  return '<div class="card"><h3>每个生肖常开号码（近'+win.length+'期）</h3><p style="font-size:10px;color:#666">正码次数与特码次数分开统计；“偏正/偏特”按每次可用位置数校正，避免把正码有6个位置误当成更热。</p><div style="overflow-x:auto"><table><tr><th>生肖</th><th>常开正码TOP3</th><th>常开特码TOP2</th><th>用途倾向</th></tr>'+body+'</table></div></div>';
}

function transitionCard(rows){
  var no=[],nz=[],az=[];for(var i=1;i<rows.length;i++){no.push(rows[i].n.filter(function(n){return rows[i-1].n.indexOf(n)>=0;}).length);var pz=new Set(rows[i-1].n.map(gz)),pz7=new Set(drawZods(rows[i-1]));nz.push(new Set(rows[i].n.map(gz)).size?Array.from(new Set(rows[i].n.map(gz))).filter(function(z){return pz.has(z);}).length:0);az.push(drawZods(rows[i]).filter(function(z){return pz7.has(z);}).length);}
  var m=currentModels(rows),nr=numberRanks(rows,m.np.name),targetN=nr.slice(0,13).map(function(x){return x.n;}),last=rows[rows.length-1],sameZ=targetN.filter(function(n){return last.n.map(gz).indexOf(gz(n))>=0;});
  return '<div class="card"><h3>上下期号码与生肖延续</h3><p>历史相邻期：正码原号重合中位数 <b>'+med(no)+'</b> 个；正码生肖重合中位数 <b>'+med(nz)+'</b> 个；7个号码去重生肖重合中位数 <b>'+med(az)+'</b> 个。</p><p><b>本期实际应用：</b>三中三13码覆盖池先保留约 '+med(nz)+' 个上期正码生肖，再由长期频率、短期趋势和遗漏验证排序。当前13码：<span style="color:#1565c0;font-weight:bold">'+targetN.map(fmt).join(' ')+'</span>；其中承接上期生肖 '+sameZ.length+' 码。该关系只作为权重，不作“必出”。</p></div>';
}

function teColumnCard(rows){
  var audit=buildAudit(rows),recent=audit.slice(-Math.min(30,audit.length));
  var trs=ATTRS.map(function(d){var vals={},total=0,ok=0;recent.forEach(function(r){var a=r.attrs.find(function(x){return x.l===d.l;});if(a){total++;if(a.ok)ok++;vals[a.v]=(vals[a.v]||0)+1;}});var now=attrExclude(rows,d),rate=total?ok/total:0,base=1-(A49.filter(function(n){return d.fn(n)===now;}).length/49),edge=rate-base;return {l:d.l,v:now,ok:ok,total:total,rate:rate,base:base,edge:edge,use:total>=15&&edge>=.04};});
  return '<div class="card"><h3>特码分析表逐列结论</h3><p style="font-size:10px;color:#666">每列都做逐期留出验证：目标期只能用之前记录。准确率表示“排除项没有开出”；必须同时高于按1—49容量计算的随机基线才启用。</p><div style="overflow-x:auto"><table><tr><th>列</th><th>下期候选排除</th><th>近'+recent.length+'期正确</th><th>随机基线</th><th>结论</th></tr>'+trs.map(function(x){return '<tr><td>'+x.l+'</td><td>'+esc(x.v)+'</td><td>'+x.ok+'/'+x.total+' ('+(100*x.rate).toFixed(1)+'%)</td><td>'+(100*x.base).toFixed(1)+'%</td><td>'+(x.use?'<b style="color:#1e8449">可小权重使用</b>':'<span style="color:#888">停用，仅观察</span>')+'</td></tr>';}).join('')+'</table></div><p><b>使用原则：</b>只把绿色列叠加缩小范围；若多列交集少于6码，自动放弃提升最小的一列，避免过度排除。</p></div>';
}

function recommendationCard(rows,kind){
  var m=applyValidatedWeights(rows),z3=numberRanks(rows,m.np.name).filter(function(x){return typeof planZ3Allowed!=='function'||planZ3Allowed(x.n);}),p13=z3.slice(0,13).map(function(x){return x.n;}),p8=p13.slice(0,8),lx=lxRanks(rows,m.lp.name).filter(function(x){return !(UP.lx_excl_zods||[]).includes(x.z);}),l5=lx.slice(0,5).map(function(x){return x.z;}),zr=zodRanks(rows,m.zp.name,false),must=zr.slice(0,3).map(function(x){return x.z;}),kill=zr.slice(-3).map(function(x){return x.z;});
  var z3Rate=m.np.n?m.np.full/m.np.n:0,z3Ok=z3Rate>z3TheoryHit(8)+.01,lxRate=m.lp.n?m.lp.full/m.lp.n:0;
  var recent=buildAudit(rows).slice(-Math.min(30,buildAudit(rows).length)),lxBase=recent.reduce(function(s,x){return s+(x.uniq>=5?choose(x.uniq,5)/choose(12,5):0);},0)/Math.max(1,recent.length),lxOk=lxRate>lxBase+.005;
  var h='<div class="card" style="border:3px solid #6a1b9a;background:#faf3ff"><h3 style="color:#6a1b9a">动态验证后评分（已应用到本期默认权重）</h3>';
  h+='<p>三中三模型：<b>'+m.np.name+'</b>（留出验证8码≥3：'+m.np.full+'/'+m.np.n+'，随机基线'+(100*z3TheoryHit(8)).toFixed(1)+'%，'+(z3Ok?'<b style="color:#1e8449">启用</b>':'<b style="color:#c0392b">未胜随机，降为覆盖参考</b>')+'）；当前8码 <b style="color:#1565c0">'+p8.map(fmt).join(' ')+'</b>，13码 <b>'+p13.map(fmt).join(' ')+'</b>。连肖模型：<b>'+m.lp.name+'</b>（'+m.lp.full+'/'+m.lp.n+'全中，'+(lxOk?'<b style="color:#1e8449">启用</b>':'<b style="color:#c0392b">未胜随机，仅作实验备选</b>')+'）；五连肖 <b style="color:#8e44ad">'+l5.join(' ')+'</b>。特肖必出3肖 <b>'+must.join(' ')+'</b>，杀3肖 <b>'+kill.join(' ')+'</b>。</p>';
  h+='<p style="font-size:10px">三中三权重已降低单双、大小、波色等弱结构项，主要使用长期频率、上期生肖延续、尾数分散和遗漏验证；“反庄家”因没有真实投注分布，权重固定为0。连肖主要使用逐肖出现概率、上下期重合和五行覆盖；特肖预测不会排除平肖。</p>';
  if(kind==='z3')h+='<button class="btn btn-green" onclick="UP.zm3_pick_pool=['+p8.join(',')+'];saveData();render();showClickFeedback(\'已应用动态8码池\')">应用8码池</button> <button class="btn btn-blue" onclick="UP.zm3_pick_pool=['+p13.join(',')+'];saveData();render();showClickFeedback(\'已应用动态13码池\')">应用13码池</button>';
  if(kind==='lx')h+='<button class="btn btn-green" onclick="UP.lx_force_zods='+JSON.stringify(l5).replace(/"/g,"'")+';saveData();render();showClickFeedback(\'已应用动态五连肖\')">应用五连肖</button>';
  return h+'</div>';
}

function auditCard(rows){
  var all=buildAudit(rows),pageSize=10,pages=Math.max(1,Math.ceil(all.length/pageSize));V1007_PAGE=Math.max(0,Math.min(V1007_PAGE,pages-1));
  var desc=all.slice().reverse(),show=desc.slice(V1007_PAGE*pageSize,(V1007_PAGE+1)*pageSize),n=all.length,kill=all.filter(function(x){return x.killOk;}).length,must=all.filter(function(x){return x.mustOk;}).length,z3=all.filter(function(x){return x.nHits.length>=3;}).length,z13=all.filter(function(x){return x.n13Hits.length>=3;}).length,lx=all.filter(function(x){return x.lHits.length===5;}).length,lxBase=all.reduce(function(s,x){return s+(x.uniq>=5?choose(x.uniq,5)/choose(12,5):0);},0)/Math.max(1,n),attrOk=0,attrN=0;all.forEach(function(x){x.attrs.forEach(function(a){attrN++;if(a.ok)attrOk++;});});
  var h='<div class="card" style="border:2px solid #0f766e"><h3 style="color:#0f766e">逐期统计排除、杀肖与必出公式复盘</h3><p>杀3肖正确 '+kill+'/'+n+' ('+(100*kill/Math.max(1,n)).toFixed(1)+'%，随机基线75%，'+(kill/n>.75?'<b style="color:#1e8449">可用</b>':'<b style="color:#c0392b">停用</b>')+')；必出3肖命中 '+must+'/'+n+' ('+(100*must/Math.max(1,n)).toFixed(1)+'%，随机基线25%，'+(must/n>.25?'<b style="color:#1e8449">可用</b>':'<b style="color:#c0392b">停用</b>')+')；三中三8码至少中3个 '+z3+'/'+n+' ('+(100*z3/Math.max(1,n)).toFixed(1)+'%，随机基线'+(100*z3TheoryHit(8)).toFixed(1)+'%)；13码至少中3个 '+z13+'/'+n+' ('+(100*z13/Math.max(1,n)).toFixed(1)+'%，随机基线'+(100*z3TheoryHit(13)).toFixed(1)+'%)；五连肖全中 '+lx+'/'+n+' ('+(100*lx/Math.max(1,n)).toFixed(1)+'%，按每期实际去重肖数的随机基线'+(100*lxBase).toFixed(1)+'%)；属性排除 '+attrOk+'/'+attrN+'。</p>';
  h+='<div style="margin:6px 0"><button class="btn btn-gray" '+(V1007_PAGE===0?'disabled':'')+' onclick="v1007SetPage('+(V1007_PAGE-1)+')">较新</button> <b>第'+(V1007_PAGE+1)+'/'+pages+'页</b> <button class="btn btn-gray" '+(V1007_PAGE>=pages-1?'disabled':'')+' onclick="v1007SetPage('+(V1007_PAGE+1)+')">较早</button></div><div style="overflow-x:auto"><table><tr><th>目标期</th><th>实际特码</th><th>杀3肖</th><th>必出3肖</th><th>属性排除</th><th>三中三8码</th><th>五连肖</th></tr>';
  show.forEach(function(x){var aok=x.attrs.filter(function(a){return a.ok;}).length;h+='<tr><td>'+x.p+'<br>'+x.d+'</td><td>'+fmt(x.actual)+' '+x.z+'</td><td style="color:'+(x.killOk?'#1e8449':'#c0392b')+'">'+x.kill.join('')+' '+(x.killOk?'✓':'✗')+'</td><td style="color:'+(x.mustOk?'#1e8449':'#c0392b')+'">'+x.must.join('')+' '+(x.mustOk?'✓':'✗')+'</td><td>'+aok+'/'+x.attrs.length+'<br><small>'+x.attrs.map(function(a){return a.l+'排'+a.v+(a.ok?'✓':'✗');}).join('；')+'</small></td><td>8码中'+x.nHits.length+'个 '+x.nHits.map(fmt).join(' ')+'<br><small>'+x.n8.map(fmt).join(' ')+'</small><br>13码中'+x.n13Hits.length+'个</td><td>中'+x.lHits.length+'/5 '+x.lHits.join('')+'<br><small>'+x.l5.join('')+'</small></td></tr>';});
  return h+'</table></div><p style="font-size:10px;color:#666">表内每一期均只用该期之前的记录计算，不使用目标期开奖。低于随机基线的公式不会作为主评分依据。</p></div>';
}
window.v1007SetPage=function(p){V1007_PAGE=Math.max(0,Number(p)||0);render();setTimeout(function(){var e=document.querySelector('[data-v1007-anchor]');if(e)e.scrollIntoView({behavior:'smooth'});},30);};

function panel(tab){
  var rows=DR.slice(),h='<div data-v1007-anchor></div>'+dataCard();if(rows.length<31)return h;
  if(tab==='rec')return h+auditCard(rows);
  if(tab==='tea'||tab==='te')return h+teColumnCard(rows)+recommendationCard(rows,'te')+commonNumberCard(rows)+transitionCard(rows)+auditCard(rows);
  if(tab==='zm3')return h+recommendationCard(rows,'z3')+commonNumberCard(rows)+transitionCard(rows)+auditCard(rows);
  if(tab==='lx')return h+recommendationCard(rows,'lx')+transitionCard(rows)+commonNumberCard(rows)+auditCard(rows);
  if(tab==='plan')return h+recommendationCard(rows,'plan')+teColumnCard(rows)+transitionCard(rows)+auditCard(rows);
  if(tab==='health'||tab==='stats'||tab==='hotcold')return h+teColumnCard(rows)+commonNumberCard(rows)+auditCard(rows);
  return h;
}

var coreRender=window.render;
window.render=function(){
  coreRender();
  try{var el=document.getElementById('tabContent');if(el)el.insertAdjacentHTML('afterbegin',panel(activeTab));}catch(e){console.error('[v10.1007 render]',e);}
};

// Start from the exact supplied files immediately, then reconcile cloud once.
if(window.V1007_MIGRATING){DR=copyRows(CUR_LOT);try{cacheCloudRows(CUR_LOT,DR);}catch(e){}calcDerived();}
applyValidatedWeights(DR);window.render();
setTimeout(migrateCloud,300);
})();
