(function () {
  'use strict';

  var VERSION = 'v10.1010.16';
  var PAGE = 0;
  var CURRENT = {};
  var CACHE = {};
  var ZODIACS = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
  // 参考源仅用于云端同步校验；官方源优先，不能直接覆盖已有开奖记录。
  var REFERENCE_SOURCES = [{name:'中彩网参考页',url:'https://yyaaff018899.49018899gg.app:8450/ok.html',priority:2,requiresValidation:true}];

  function fmt(n) { return String(n).padStart(2, '0'); }
  function choose(n, k) { if (k < 0 || k > n) return 0; var r = 1; for (var i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; }
  function uniq(a) { return Array.from(new Set(a)); }
  function zod(n) { return gz(n); }
  function drawZods(r) { return uniq(r.n.concat([r.t]).map(zod)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>\"]/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'})[c]; }); }
  function localDate(d) { d = d || new Date(); return String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0'); }
  function parseMD(s) { var a = String(s || '').split('/').map(Number); if (a.length !== 2) return null; var y = new Date().getFullYear(), d = new Date(y, a[0] - 1, a[1]); return isNaN(d.getTime()) ? null : d; }
  function nextRecordedDate(rows) {
    var last = rows[rows.length - 1], d = parseMD(last.d) || new Date(), days = LOTTERIES[CUR_LOT].draw_days;
    d.setDate(d.getDate() + 1);
    if (days) for (var i = 0; i < 20 && days.indexOf(d.getDay()) < 0; i++) d.setDate(d.getDate() + 1);
    return localDate(d);
  }
  function targetMeta(rows) { var s = rows[rows.length - 1]; return { sourcePeriod:s.p, targetPeriod:s.p + 1, estimatedDate:nextRecordedDate(rows) }; }
  function rejectedRecord(lot,r){if(!r)return false;var ns=(r.n||[]).slice().sort(function(a,b){return a-b;}).join(',');return lot==='la'&&r.p===280&&ns==='3,21,26,33,42,45'&&Number(r.t)===22;}
  if(typeof authoritativeRows==='function')window.mergeAuthoritativeSnapshot=function(lot,rows){var seed=authoritativeRows(lot).map(function(r){return {p:r.p,d:r.d,n:r.n.slice(),t:r.t};}),map={},max=0;seed.forEach(function(r){map[r.p]=r;max=Math.max(max,r.p);});(rows||[]).forEach(function(r){if(r&&r.p>max&&validCloudRecord(lot,r)&&!rejectedRecord(lot,r))map[r.p]=r;});return Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return a.p-b.p;});};
  function purgeRejected(){if(!Array.isArray(DR))return;var before=DR.length;DR=DR.filter(function(r){return !rejectedRecord(CUR_LOT,r);});if(before!==DR.length){UP.v1008_forecasts=(UP.v1008_forecasts||[]).filter(function(r){return !(r.lot==='la'&&r.targetPeriod>280);});try{saveData();}catch(e){}}}

  function rank01(obj) {
    var a = A49.slice().sort(function (x, y) { return obj[x] - obj[y] || x - y; }), out = {};
    a.forEach(function (n, i) { out[n] = i / 48; }); return out;
  }
  function numberFeatures(hist, field) {
    field = field || 'n';
    var last = hist[hist.length - 1], longRows = hist.slice(-60), shortRows = hist.slice(-8), lc = {}, sc = {}, om = {}, seen = {};
    A49.forEach(function (n) { lc[n] = 0; sc[n] = 0; seen[n] = 0; });
    function nums(r) { return field === 't' ? [r.t] : r.n; }
    longRows.forEach(function (r) { nums(r).forEach(function (n) { lc[n]++; }); });
    shortRows.forEach(function (r) { nums(r).forEach(function (n) { sc[n]++; }); });
    hist.slice(-6).forEach(function (r) { nums(r).forEach(function (n) { seen[n] = 1; }); });
    A49.forEach(function (n) { var q = 0; for (var i = hist.length - 1; i >= 0; i--) { if (nums(hist[i]).indexOf(n) >= 0) break; q++; } om[n] = Math.min(q, 30); });
    var lr = rank01(lc), sr = rank01(sc), or = rank01(om), lastNums = new Set(nums(last)), lz = new Set(nums(last).map(zod)), lt = new Set(nums(last).map(function (n) { return n % 10; }));
    var f = {}; A49.forEach(function (n) { f[n] = { long:lr[n] - .5, short:sr[n] - .5, omit:or[n] - .5, repeat:lastNums.has(n) ? 1 : 0, sameZod:lz.has(zod(n)) ? 1 : 0, complement:lz.has(zod(n)) && !lastNums.has(n) ? 1 : 0, sameTail:lt.has(n % 10) ? 1 : 0, seen6:seen[n] ? 1 : 0 }; });
    return { f:f, longCount:lc, shortCount:sc, omission:om };
  }

  var NUM_MODELS = {
    balance:{long:.48,short:.22,omit:.07,complement:.32,sameTail:.16,repeat:-.25,seen6:.08},
    continuity:{long:.34,short:.18,omit:.02,complement:.48,sameTail:.28,repeat:-.16,seen6:.12},
    complement:{long:.30,short:.08,omit:.08,complement:.68,sameTail:.18,repeat:-.38,seen6:.05},
    rebound:{long:.18,short:-.20,omit:.62,complement:.20,sameTail:.10,repeat:-.25,seen6:-.12},
    frequency:{long:.72,short:.32,omit:-.10,complement:.18,sameTail:.08,repeat:-.12,seen6:.15}
  };
  function numberRank(hist, model, field) {
    var p = numberFeatures(hist, field), w = NUM_MODELS[model], score = {};
    A49.forEach(function (n) { var v = 0; Object.keys(p.f[n]).forEach(function (k) { v += (w[k] || 0) * p.f[n][k]; }); score[n] = v; });
    return { list:A49.slice().sort(function (a, b) { return score[b] - score[a] || a - b; }), score:score, pack:p };
  }
  function allowedNumber(n) { return typeof planZ3Allowed !== 'function' || planZ3Allowed(n); }
  function balancedPool(hist, model, size, usePrefs) {
    var rank = numberRank(hist, model, 'n').list, allowed = rank.filter(function (n) { return !usePrefs || allowedNumber(n); }), out = [], zc = {}, hc = {};
    allowed.forEach(function (n) { if (out.length >= size) return; var z = zod(n), h = Math.floor(n / 10); if ((zc[z] || 0) >= 2 || (hc[h] || 0) >= 3) return; out.push(n); zc[z] = (zc[z] || 0) + 1; hc[h] = (hc[h] || 0) + 1; });
    allowed.forEach(function (n) { if (out.length < size && out.indexOf(n) < 0) out.push(n); }); return out;
  }
  function auditZ3(rows, model, limit) {
    var start = Math.max(30, rows.length - (limit || 70)), d = [], full = 0, totalHits = 0;
    for (var i = start; i < rows.length; i++) { var pool = balancedPool(rows.slice(0, i), model, 8, false), hits = rows[i].n.filter(function (n) { return pool.indexOf(n) >= 0; }); full += hits.length >= 3 ? 1 : 0; totalHits += hits.length; d.push({source:rows[i-1].p,target:rows[i].p,date:rows[i].d,pool:pool,hits:hits}); }
    return {model:model,n:d.length,full:full,mean:totalHits / Math.max(1, d.length),detail:d};
  }
  function dataKey(rows) { return rows.map(function(r){return [r.p,r.d,r.n.join(','),r.t].join(':');}).join('|'); }
  function bestZ3(rows) {
    var key = CUR_LOT + '|z3|' + dataKey(rows); if (CACHE[key]) return CACHE[key];
    var a = Object.keys(NUM_MODELS).map(function (m) { return auditZ3(rows, m, 70); });
    a.sort(function (x, y) { return (y.full + 1) / (y.n + 2) - (x.full + 1) / (x.n + 2) || y.mean - x.mean; }); return CACHE[key] = a[0];
  }

  var LX_MODELS = { balanced:{long:.34,short:.22,prev:.30,omit:-.12}, continuity:{long:.24,short:.14,prev:.58,omit:-.04}, trend:{long:.22,short:.52,prev:.20,omit:-.04}, rebound:{long:.30,short:.12,prev:.20,omit:.34} };
  function lxPool(hist, model, usePrefs) {
    var w = LX_MODELS[model], last = hist[hist.length - 1], prev = new Set(drawZods(last)), lng = hist.slice(-60), sh = hist.slice(-8), score = {};
    ZODS.forEach(function (z) { var l = lng.filter(function (r) { return drawZods(r).indexOf(z) >= 0; }).length / Math.max(1, lng.length), s = sh.filter(function (r) { return drawZods(r).indexOf(z) >= 0; }).length / Math.max(1, sh.length), om = 0; for (var i = hist.length - 1; i >= 0; i--) { if (drawZods(hist[i]).indexOf(z) >= 0) break; om++; } score[z] = w.long*l + w.short*s + w.prev*(prev.has(z)?1:0) + w.omit*Math.min(om,10)/10; });
    var excl = usePrefs ? (UP.lx_excl_zods || []) : [], force = usePrefs ? (UP.lx_force_zods || []) : [], allowed = ZODS.filter(function (z) { return excl.indexOf(z) < 0; }), out = [];
    force.forEach(function (z) { if (allowed.indexOf(z) >= 0 && out.indexOf(z) < 0 && out.length < 6) out.push(z); });
    allowed.sort(function (a, b) { return score[b] - score[a] || ZODS.indexOf(a) - ZODS.indexOf(b); }).forEach(function (z) { if (out.length < 6 && out.indexOf(z) < 0) out.push(z); }); return out;
  }
  function auditLX(rows, model, limit) {
    var start = Math.max(30, rows.length - (limit || 70)), d = [], full = 0, sum = 0;
    for (var i = start; i < rows.length; i++) { var pool = lxPool(rows.slice(0,i), model, false), actual = drawZods(rows[i]), hits = pool.filter(function (z) { return actual.indexOf(z) >= 0; }); full += hits.length >= 5 ? 1 : 0; sum += hits.length; d.push({source:rows[i-1].p,target:rows[i].p,date:rows[i].d,pool:pool,hits:hits}); }
    return {model:model,n:d.length,full:full,mean:sum/Math.max(1,d.length),detail:d};
  }
  function bestLX(rows) { var key=CUR_LOT+'|lx|'+dataKey(rows); if(CACHE[key])return CACHE[key]; var a=Object.keys(LX_MODELS).map(function(m){return auditLX(rows,m,70);}); a.sort(function(x,y){return (y.full+1)/(y.n+2)-(x.full+1)/(x.n+2)||y.mean-x.mean;}); return CACHE[key]=a[0]; }

  function ensureEvidence() {
    UP.v1008_forecasts = UP.v1008_forecasts || [];
    if (!UP.v1008_forecasts.some(function (r) { return r && r.lot === 'gc' && r.targetPeriod === 106 && r.evidence === '用户截图核对'; })) {
      UP.v1008_forecasts.push({lot:'gc',sourcePeriod:105,targetPeriod:106,targetDate:'10/06',generatedAt:'2026-10-06T22:00:00+08:00',algorithmVersion:'截图原方案',z3_8:[9,31,45,34,30,7,25,4],lx6:[],evidence:'用户截图核对'});
    }
    UP.v1008_image_refs = UP.v1008_image_refs || [];
    if (!UP.v1008_image_refs.some(function(r){return r.id==='img-281-paogou';})) UP.v1008_image_refs.push({id:'img-281-paogou',period:281,label:'跑狗九肖',zods:['羊','马','龙','蛇','猪','鼠','鸡','虎','兔'],nums:[4,24,31,45],note:'暗码；仅保存为截图参考，未自动排除'});
    if (!UP.v1008_image_refs.some(function(r){return r.id==='img-gc106-ai';})) UP.v1008_image_refs.push({id:'img-gc106-ai',period:106,label:'港彩AI解码',zods:['龙','虎'],nums:[4,28,16],note:'诗句解码参考，不作为历史开奖或硬限制'});
  }
  function saveForecast(x) {
    var arr=UP.v1008_forecasts||[], old=arr.find(function(r){return r&&r.lot===CUR_LOT&&r.targetPeriod===x.meta.targetPeriod&&!r.evidence;});
    if(!old){old={lot:CUR_LOT,sourcePeriod:x.meta.sourcePeriod,targetPeriod:x.meta.targetPeriod,targetDate:x.meta.estimatedDate,generatedAt:new Date().toISOString(),algorithmVersion:VERSION,z3_8:x.p8.slice(),z3_13:x.p13.slice(),lx6:x.lx.slice()};arr.push(old);UP.v1008_forecasts=arr.slice(-300);try{saveData();}catch(e){}}
    return old;
  }
  function analyze(rows) { var z=bestZ3(rows), l=bestLX(rows), x={meta:targetMeta(rows),z:z,l:l,p8:balancedPool(rows,z.model,8,true),p13:balancedPool(rows,z.model,13,true),lx:lxPool(rows,l.model,true)};x.saved=saveForecast(x);CURRENT[CUR_LOT]=x;return x; }

  window.getPracticeContext=function(){
    var rows=DR,normal={},special={},Z100=calcZ100();if(!rows||rows.length<31)return null;
    var hot=A49.slice().sort(function(a,b){return (Z100[b]||0)-(Z100[a]||0);}).slice(0,10),cold=A49.slice().sort(function(a,b){return (Z100[a]||0)-(Z100[b]||0);}).slice(0,10),om=calcZm2Om(),omRank=A49.slice().sort(function(a,b){return (om[b]||0)-(om[a]||0);}),omCold=A49.slice().sort(function(a,b){return (om[a]||0)-(om[b]||0);});
    function practicalAllowed(n){if(!allowedNumber(n))return false;var checks=[['zm3_z100_hot',hot,true],['zm3_z100_cold',cold,true],['zm3_z100_hot7',hot.slice(0,7),true],['zm3_z100_cold7',cold.slice(0,7),true],['zm3_zm2_om10',omRank.slice(0,20),true],['zm3_excl_z100_hot',hot,false],['zm3_excl_z100_cold',cold,false],['zm3_excl_z100_hot7',hot.slice(0,7),false],['zm3_excl_z100_cold7',cold.slice(0,7),false],['zm3_excl_zm2_om10',omRank.slice(0,20),false],['zm3_excl_om7',omRank.slice(0,7),false],['zm3_excl_om7_cold',omCold.slice(0,7),false]];return !checks.some(function(c){return UP[c[0]]&&(c[1].includes(n)!==c[2]);});}
    function pairsValid(ns){if(UP.zm3_base_9x&&(UP.lx9_seq1||[]).length===9&&ns.filter(function(n){return !UP.lx9_seq1.includes(gz(n));}).length>(typeof UP.zm3_base_9x_out==='number'?UP.zm3_base_9x_out:2))return false;return !(UP.zm3_no_together||[]).some(function(pair){return pair.length>=2&&pair.slice(0,2).every(function(v){return ns.some(function(n){return typeof v==='number'?n===v:gz(n)===v;});});});}
    function trioValid(ns){if(!pairsValid(ns))return false;var counts={};ns.forEach(function(n){var z=gz(n);counts[z]=(counts[z]||0)+1;});var doubled=Object.keys(counts).filter(function(z){return counts[z]>=2;}).length,last=rows[rows.length-1].n.concat(rows[rows.length-1].t);return !(UP.zm3_one_zod_2&&doubled!==1||UP.zm3_two_zod_2&&doubled!==2||UP.zm3_same_tail&&!ns.some(function(n){return last.some(function(q){return q%10===n%10;});})||UP.zm3_same_zod&&!ns.every(function(n){return last.some(function(q){return gz(q)===gz(n);});}));}
    ['balance','continuity','complement'].forEach(function(m){normal[m]=numberRank(rows,m,'n').list.filter(practicalAllowed);});
    ['balance','frequency','rebound'].forEach(function(m){special[m]=numberRank(rows,m,'t').list.filter(function(n){return typeof planTeAllowed!=='function'||planTeAllowed(n);});});
    var lx=typeof planReasonLx==='function'?planReasonLx(rows,5,{window:60}):null;
    return {lot:CUR_LOT,meta:targetMeta(rows),rows:rows.map(function(r){return {p:r.p,d:r.d,n:r.n.slice(),t:r.t};}),normal:normal,special:special,lx:lx?[lx.best].concat(lx.alts||[]).filter(Boolean).map(function(x){return x.zs;}):[],
      blockedTe:A49.filter(function(n){return typeof planTeAllowed==='function'&&!planTeAllowed(n);}),blockedZ3:A49.filter(function(n){return !practicalAllowed(n);}),blockedLx:uniq((UP.lx_excl_zods||[]).concat(UP.lx_ban_zods||[])),noTogether:UP.zm3_no_together||[],
      attrs:function(n){return {生肖:gz(n),大小:gsz(n),单双:gpar(n),合数单双:ghe(n),家野:gfam(n),波色:gwv(n),五行:gwx(n),尾数:String(n%10),头数:String(Math.floor(n/10))};},zod:zod,zodElement:typeof zodWx==='function'?zodWx:null,
      teAllowed:function(n){return typeof planTeAllowed!=='function'||planTeAllowed(n);},z3Allowed:practicalAllowed,poolValid:pairsValid,tripleValid:trioValid};
  };
  var preferenceContext=window.getPracticeContext;
  window.getPracticeContext=function(independent){if(!independent)return preferenceContext();var savedPrefs=UP;try{UP={};var c=preferenceContext();if(c){c.teAllowed=function(){return true;};c.z3Allowed=function(){return true;};c.poolValid=function(){return true;};c.tripleValid=function(){return true;};c.noTogether=[];c.blockedTe=[];c.blockedZ3=[];c.blockedLx=[];}return c;}finally{UP=savedPrefs;}};
  function dayPillar(d) { var base=new Date(2026,9,8), delta=Math.round((new Date(d.getFullYear(),d.getMonth(),d.getDate())-base)/86400000), gan=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'], zhi=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']; return gan[(1+delta%10+10)%10]+zhi[(3+delta%12+12)%12]; }
  function luckyZods(dayZ) { var six={鼠:'牛',牛:'鼠',虎:'猪',猪:'虎',兔:'狗',狗:'兔',龙:'鸡',鸡:'龙',蛇:'猴',猴:'蛇',马:'羊',羊:'马'}, tri=[['猴','鼠','龙'],['虎','马','狗'],['猪','兔','羊'],['蛇','鸡','牛']], out=[six[dayZ]];tri.forEach(function(g){if(g.indexOf(dayZ)>=0)out=out.concat(g.filter(function(z){return z!==dayZ;}));});return uniq(out); }
  function calendarCard(rows) { var meta=targetMeta(rows),md=meta.estimatedDate, d=parseMD(md)||new Date(), dz=typeof getDayZod==='function'?getDayZod(md):'', ch=typeof getDayChong==='function'?getDayChong(md):'', lucky=luckyZods(dz); return '<div class="v10-card v10-cal"><b>目标期万年历参考｜'+md+' '+dayPillar(d)+'日</b><div class="v10-big">日肖 '+dz+'　冲煞 '+(ch?'冲'+ch:'--')+'　幸运生肖 '+lucky.join('、')+'</div><small>冲煞按目标开奖日期的万年历固定规则显示；幸运生肖只作为平特肖辅助参考，不作为硬排除条件。</small></div>'; }

  function z3Theory(n){var den=choose(49,6),s=0;for(var k=3;k<=Math.min(6,n);k++)s+=choose(n,k)*choose(49-n,6-k);return s/den;}
  function why(n, pack){var f=pack.f[n],a=[];if(f.complement)a.push('同肖换位');if(f.sameTail)a.push('同尾');if(f.omit>.25)a.push('偏冷遗漏');if(f.short>.25)a.push('近期常出');if(f.seen6)a.push('近6期出现');return a.slice(0,2).join('/')||'长期频率';}
  function z3Card(rows,x){var p=numberFeatures(rows,'n'),rate=x.z.full/Math.max(1,x.z.n);return '<div class="v10-card v10-z3"><div class="v10-title">三中三｜预测第'+x.meta.targetPeriod+'期</div><div>依据第'+x.meta.sourcePeriod+'期以前记录；预计开奖日 '+x.meta.estimatedDate+'（港彩节假日可能顺延，期号不随日期改写）。</div><div class="v10-pool">8码池　'+x.p8.map(fmt).join('　')+'</div>'+(x.p8.length<8?'<div class="v10-warn">当前硬限制后只剩'+x.p8.length+'码。系统不会把你排除的号码放回；请减少限制后再凑8码。</div>':'')+'<button class="btn btn-green" onclick="v10100803Apply(\'z3\')" '+(x.p8.length<8?'disabled':'')+'>应用为第'+x.meta.targetPeriod+'期8码池</button><details class="v10-detail" open><summary>展开三中三完整分析（手机/电脑可用）</summary><p>动态模型：<b>'+x.z.model+'</b>。近'+x.z.n+'期逐期滚动回测，中≥3码 '+x.z.full+'期（'+(rate*100).toFixed(1)+'%）；纯随机8码理论值 '+(z3Theory(8)*100).toFixed(2)+'%。</p><p><b>逐码依据：</b>'+x.p8.map(function(n){return fmt(n)+' '+why(n,p);}).join('；')+'</p><p><b>扩展13码：</b>'+x.p13.map(fmt).join(' ')+'</p><p>上期同生肖换码、同尾、号码冷热、遗漏与已出/未出同时进入评分；只有滚动回测有提升的模型才会成为当前模型。</p></details></div>';}
  function combos5(pool){var a=[];for(var i=0;i<pool.length;i++)a.push(pool.filter(function(_,j){return i!==j;}));return a;}
  function lxCard(rows,x){var prev=drawZods(rows[rows.length-1]),rate=x.l.full/Math.max(1,x.l.n),cs=combos5(x.lx);return '<div class="v10-card v10-lx"><div class="v10-title">连肖｜预测第'+x.meta.targetPeriod+'期</div><div class="v10-pool">6肖复式池　'+x.lx.join('　')+'</div><button class="btn btn-green" onclick="v10100803Apply(\'lx\')">应用6肖复式池</button><details class="v10-detail" open><summary>展开连肖完整分析（手机/电脑可用）</summary><p>6肖组成 C(6,5)=6 组五连肖：'+cs.map(function(c,i){return '#'+(i+1)+' '+c.join('');}).join('；')+'</p><p>与上期7个开奖号去重生肖重合 '+x.lx.filter(function(z){return prev.indexOf(z)>=0;}).length+' 个。动态模型 <b>'+x.l.model+'</b>；近'+x.l.n+'期滚动回测，单个6肖池覆盖≥5肖 '+x.l.full+'期（'+(rate*100).toFixed(1)+'%），平均覆盖 '+x.l.mean.toFixed(2)+'/6。</p><p>“特码生肖降分”只影响特码，不会把该生肖从平肖连肖中硬删除；只有你在连肖页明确排除的生肖才会删除。</p></details></div>';}

  function specialExclude(rows){var rank=numberRank(rows,'balance','t').list,ex=rank.slice().reverse().slice(0,8),start=Math.max(30,rows.length-70),ok=0,n=0;for(var i=start;i<rows.length;i++){var q=numberRank(rows.slice(0,i),'balance','t').list.slice().reverse().slice(0,8);if(q.indexOf(rows[i].t)<0)ok++;n++;}return {nums:ex,n:n,ok:ok};}
  function streakStats(rows){var defs=[['大小',gsz],['单双',gpar],['合数单双',ghe],['家野',gfam],['波色',gwv],['五行',gwx]],out=[];defs.forEach(function(d){var base=0,bn=0,cont=0,cn=0;for(var i=1;i<rows.length;i++){var cur=d[1](rows[i].t),prev=d[1](rows[i-1].t);bn++;if(cur===prev)base++;var run=1;for(var j=i-1;j>0&&d[1](rows[j-1].t)===prev;j--)run++;if(run>=3){cn++;if(cur===prev)cont++;}}out.push({name:d[0],base:base/Math.max(1,bn),cond:cont/Math.max(1,cn),n:cn});});return out;}
  function teCard(rows){var e=specialExclude(rows),s=streakStats(rows);return '<div class="v10-card v10-te"><div class="v10-title">特码动态排除与属性延续</div><div class="v10-pool">软排除8码　'+e.nums.map(fmt).join('　')+'</div><p>近'+e.n+'期滚动验证，这8码没有包含当期特码 '+e.ok+'期（'+(100*e.ok/Math.max(1,e.n)).toFixed(1)+'%）。随机排除8码的理论保留率是 '+(100*41/49).toFixed(1)+'%；低于或接近理论值时只能观察，不能当作“必杀”。</p><details class="v10-detail"><summary>查看属性连续多期后，下一期是延续还是反转</summary><table><tr><th>属性</th><th>平时延续</th><th>连续≥3期后仍延续</th><th>样本</th></tr>'+s.map(function(q){return '<tr><td>'+q.name+'</td><td>'+(q.base*100).toFixed(1)+'%</td><td>'+(q.cond*100).toFixed(1)+'%</td><td>'+q.n+'</td></tr>';}).join('')+'</table><p>连续多期并不会自动让下一期更不可能。系统只在“连续后延续率”与平时有差异且样本够用时调整权重，避免把反人类心理当成必然规律。</p></details></div>';}

  function evidenceRows(rows,x){var saved=(UP.v1008_forecasts||[]).filter(function(r){return r&&r.lot===CUR_LOT;}).sort(function(a,b){return b.targetPeriod-a.targetPeriod;});var out=[];saved.forEach(function(r){var actual=rows.find(function(q){return q.p===r.targetPeriod;}),hits=actual&&r.z3_8?actual.n.filter(function(n){return r.z3_8.indexOf(n)>=0;}):[];out.push({r:r,actual:actual,hits:hits});});return out;}
  function auditCard(rows,x){var a=evidenceRows(rows,x),pages=Math.max(1,Math.ceil(a.length/8));PAGE=Math.max(0,Math.min(PAGE,pages-1));a=a.slice(PAGE*8,PAGE*8+8);return '<div class="v10-card"><div class="v10-title">按实际目标期锁定与核对</div><p>每次方案保存“依据期→目标期”。补录开奖后只核对同一期，不会把106期方案改成107期。</p><button class="btn btn-gray" onclick="v10100803Page('+(PAGE-1)+')" '+(PAGE===0?'disabled':'')+'>上一页</button> '+(PAGE+1)+'/'+pages+' <button class="btn btn-gray" onclick="v10100803Page('+(PAGE+1)+')" '+(PAGE>=pages-1?'disabled':'')+'>下一页</button><div class="v10-scroll"><table><tr><th>来源→目标</th><th>锁定8码</th><th>开奖核对</th><th>来源</th></tr>'+a.map(function(q){return '<tr><td>'+q.r.sourcePeriod+'→<b>'+q.r.targetPeriod+'</b><br>'+esc(q.r.targetDate||'')+'</td><td>'+((q.r.z3_8||[]).map(fmt).join(' '))+'</td><td>'+(q.actual?('中'+q.hits.length+'码 '+q.hits.map(fmt).join(' ')):'待开奖/待录入')+'</td><td>'+esc(q.r.evidence||q.r.algorithmVersion||'自动')+'</td></tr>';}).join('')+'</table></div></div>';}

  function parseImageText(text){var nums=[],m;String(text||'').replace(/\d{1,4}/g,function(s){var n=Number(s);if(n>=1&&n<=49&&nums.indexOf(n)<0)nums.push(n);return s;});var zs=ZODIACS.filter(function(z){return String(text||'').indexOf(z)>=0;});return {nums:nums,zods:zs};}
  window.v10100803ParseImage=function(){var el=document.getElementById('v10-img-text'),out=document.getElementById('v10-img-result');if(!el||!out)return;var p=parseImageText(el.value);window.__v10ImgParsed=p;out.innerHTML='<b>号码：</b>'+(p.nums.map(fmt).join(' ')||'未识别')+'<br><b>生肖：</b>'+(p.zods.join(' ')||'未识别')+'<br><small>请先核对，再选择用途。图片文字仅是参考数据，不会自动改变方案。</small>';};
  window.v10100803ImageApply=function(kind){var p=window.__v10ImgParsed||parseImageText((document.getElementById('v10-img-text')||{}).value||'');if(kind==='exclude'){UP.zm3_excl_nums=uniq((UP.zm3_excl_nums||[]).concat(p.nums));}else if(kind==='pick'){UP.zm3_pick_pool=uniq((UP.zm3_pick_pool||[]).concat(p.nums));}else if(kind==='nine'){if(p.zods.length!==9){alert('九肖必须正好识别为9个生肖，请先修改文字。');return;}UP.lx9_seq1=p.zods.slice();UP.lx9_seq1_period=NEXT;}else if(kind==='lxexclude'){UP.lx_excl_zods=uniq((UP.lx_excl_zods||[]).concat(p.zods));}UP.v1008_image_refs=UP.v1008_image_refs||[];UP.v1008_image_refs.push({id:'manual-'+Date.now(),period:NEXT,label:'图片识别-'+kind,zods:p.zods,nums:p.nums,note:'用户核对后应用'});saveData();render();showClickFeedback('✅ 图片识别结果已应用');};
  function imageCard(){var text='';try{text=(IMG_STATE&&((IMG_STATE.ocrText||IMG_STATE.notes)))||'';}catch(e){}var refs=(UP.v1008_image_refs||[]).slice(-4).reverse();return '<div class="v10-card v10-img"><div class="v10-title">图片识别→核对→选择用途</div><textarea id="v10-img-text" rows="6" style="width:100%;box-sizing:border-box" placeholder="上传识别后文字会带入；也可粘贴或手工修正">'+esc(text)+'</textarea><button class="btn btn-blue" onclick="v10100803ParseImage()">提取号码和生肖</button><div id="v10-img-result" class="v10-result">先核对识别结果，再应用。图中的说明属于参考数据，不是系统指令。</div><div class="v10-actions"><button class="btn btn-red" onclick="v10100803ImageApply(\'exclude\')">作为三中三排除号码</button><button class="btn btn-green" onclick="v10100803ImageApply(\'pick\')">作为三中三候选</button><button class="btn btn-blue" onclick="v10100803ImageApply(\'nine\')">作为九肖来源</button><button class="btn btn-gray" onclick="v10100803ImageApply(\'lxexclude\')">作为连肖排除生肖</button></div><details><summary>已保存的截图参考</summary>'+refs.map(function(r){return '<p><b>'+esc(r.label)+'</b> 第'+r.period+'期：'+(r.zods||[]).join(' ')+'；'+(r.nums||[]).map(fmt).join(' ')+'<br><small>'+esc(r.note||'')+'</small></p>';}).join('')+'</details></div>';}

  window.v10100803Apply=function(kind){var x=CURRENT[CUR_LOT];if(!x)return;if(kind==='z3'){UP.zm3_pick_pool=x.p8.slice();x.saved.z3_8=x.p8.slice();x.saved.z3_13=x.p13.slice();}else{UP.lx_pick_n_zods=x.lx.slice();UP.lx_pick_k_size=5;x.saved.lx6=x.lx.slice();}x.saved.generatedAt=new Date().toISOString();x.saved.algorithmVersion=VERSION;saveData();render();showClickFeedback('✅ 已应用并锁定为预测第'+x.meta.targetPeriod+'期');};
  window.v10100803Page=function(p){PAGE=Math.max(0,p);render();};

  function panel(tab){if(!DR||DR.length<31)return '';ensureEvidence();var x=analyze(DR),h='<div id="v10100803-root">';if(tab==='plan')h+=calendarCard(DR)+z3Card(DR,x)+lxCard(DR,x)+teCard(DR)+auditCard(DR,x);if(tab==='zm3')h+=z3Card(DR,x)+auditCard(DR,x);if(tab==='lx')h+=lxCard(DR,x)+auditCard(DR,x);if(tab==='te'||tab==='tea')h+=teCard(DR);if(tab==='rec'||tab==='rev')h+=auditCard(DR,x);if(tab==='img')h+=imageCard();return h+'</div>';}

  var originalPeriodForDate=window.periodForRecordDate, originalAdd=window.addRecord, originalEdit=window.editRecord;
  window.reindexRecordsByDate=function(){var seen={},bad=[],changed=0;DR.forEach(function(r){var d=canonicalRecordDate(r.d);if(!(Number(r.p)>0)||!d||seen[r.p]){bad.push(r.p);return;}seen[r.p]=1;if(r.d!==d){r.d=d;changed++;}});if(bad.length)return {changed:0,error:'期号重复或日期无效：'+bad.join('、')};DR.sort(function(a,b){return a.p-b.p;});return {changed:changed,error:''};};
  window.addRecord=function(){var p=Number((document.getElementById('record-period')||{}).value);if(!(p>0)){return originalAdd.apply(this,arguments);}var old=window.periodForRecordDate;window.periodForRecordDate=function(){return p;};try{return originalAdd.apply(this,arguments);}finally{window.periodForRecordDate=old;}};
  window.editRecord=function(idx){var keep=DR[idx]&&DR[idx].p,old=window.periodForRecordDate;window.periodForRecordDate=function(){return keep;};try{return originalEdit.apply(this,arguments);}finally{window.periodForRecordDate=old;}};

  var css=document.createElement('style');css.textContent='#v10100803-root{font-size:12px}.v10-card{background:#fff;border:2px solid #d7dde5;border-radius:10px;padding:10px;margin:0 0 10px;line-height:1.55}.v10-title{font-size:18px;font-weight:800;margin-bottom:5px}.v10-pool{font-size:18px;font-weight:800;padding:8px;margin:7px 0;background:#f4f7fb;border-radius:7px}.v10-z3{border-color:#1565c0}.v10-z3 .v10-title,.v10-z3 .v10-pool{color:#1565c0}.v10-lx{border-color:#8e24aa}.v10-lx .v10-title,.v10-lx .v10-pool{color:#8e24aa}.v10-te{border-color:#c0392b}.v10-te .v10-title,.v10-te .v10-pool{color:#c0392b}.v10-cal{border-color:#d49614;background:#fffaf0}.v10-big{font-size:16px;font-weight:700;margin:5px 0}.v10-detail{margin-top:8px;background:#f8fafc;border-radius:7px;padding:7px}.v10-detail summary{font-size:14px;font-weight:800;cursor:pointer;padding:4px}.v10-scroll{overflow-x:auto}.v10-card table{width:100%;border-collapse:collapse;margin-top:6px}.v10-card th,.v10-card td{border:1px solid #ddd;padding:4px;text-align:left;white-space:normal}.v10-warn{color:#c0392b;font-weight:700;margin:5px 0}.v10-result{background:#f8f9fa;padding:8px;margin:7px 0;border-radius:6px}.v10-actions{display:flex;gap:5px;flex-wrap:wrap}@media(max-width:600px){.v10-card{padding:8px}.v10-title{font-size:16px}.v10-pool{font-size:16px;word-break:break-word}.v10-card th,.v10-card td{font-size:10px;padding:3px}.v10-detail summary{font-size:13px}.v10-actions .btn{flex:1 1 46%;font-size:10px}}';document.head.appendChild(css);

  var coreRender=window.render;
  window.render=function(){purgeRejected();var viewWindow=typeof winApply==='function'&&activeTab!=='rec'?winApply():false;try{coreRender();try{var strip=document.getElementById('latest-draw-strip'),last=DR&&DR[DR.length-1];if(strip)strip.innerHTML=last?'<b>'+esc(LOTTERIES[CUR_LOT].name)+' 当前查看开奖 · 第'+last.p+'期 '+esc(last.d||'')+'</b><br>正码 '+last.n.map(function(n){return '<span style="display:inline-block;margin:3px">'+ball(n,28)+' '+esc(gz(n))+'</span>';}).join(' ')+' <b>＋ 特码 '+ball(last.t,30)+' '+esc(gz(last.t))+'</b>':'暂无已录入开奖';var title=document.getElementById('appTitle');if(title)title.innerHTML=LOTTERIES[CUR_LOT].icon+' '+LOTTERIES[CUR_LOT].name+'分析工具 '+VERSION+' · 预测第<span id="nextPeriod">'+NEXT+'</span>期';var fixed=(CURRENT[CUR_LOT]&&CURRENT[CUR_LOT].meta&&CURRENT[CUR_LOT].meta.estimatedDate)||pToDate(NEXT),dz=getDayZod(fixed),ch=getDayChong(fixed),hdr=document.getElementById('hdr-chong');if(hdr)hdr.innerHTML='📅 目标期 '+fixed.replace('/','月')+'日 '+dz+'日冲'+ch+'　<span style="font-size:10px;color:#555">冲煞按万年历固定规则，幸运生肖仅辅助平特肖</span>';if(hdr){var todayParts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),todayMD=todayParts.find(function(p){return p.type==='month';}).value+'/'+todayParts.find(function(p){return p.type==='day';}).value,todayDZ=getDayZod(todayMD);hdr.innerHTML='<div style="font-size:14px;color:#7b258c;background:#fff4ce;padding:6px;border-radius:6px"><b>今日 '+todayMD+' 幸运生肖：'+luckyZods(todayDZ).join('、')+'</b>（六合＋三合参考）</div>'+hdr.innerHTML+'<div style="color:#174e9a;font-weight:bold">目标开奖日幸运生肖：'+luckyZods(dz).join('、')+'</div>';}var el=document.getElementById('tabContent');if(el){var old=el.querySelector('#v10100803-root');if(old)old.remove();el.insertAdjacentHTML('afterbegin',panel(activeTab));}}catch(e){console.error('[v10.1008.03]',e);var box=document.getElementById('tabContent');if(box)box.insertAdjacentHTML('afterbegin','<div class="v10-card v10-warn">新版分析加载错误：'+esc(e.message)+'</div>');}}finally{if(typeof winRelease==='function')winRelease(viewWindow);}};
  window.render();
})();
