/* Research only. This module never reads or writes production scoring weights. */
(function(root){
'use strict';
const VERSION='discovery-v1', MIN_TRAIN=30, MIN_VALID=12, PRIOR=20;
const choose=(n,k)=>{if(k<0||k>n)return 0;let x=1;for(let i=1;i<=k;i++)x=x*(n-k+i)/i;return x;};
const uniq=a=>[...new Set(a)];
const pct=x=>Math.round(x*10000)/100;
function hash(x){let h=2166136261;for(const c of JSON.stringify(x)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(16);}
function prepare(input){
 const issues=[],rows=[],groups=new Map();
 for(const r of input.rows){if(!groups.has(r.p))groups.set(r.p,[]);groups.get(r.p).push(r);}
 for(const [p,rs] of groups){
  if(rs.length!==1){issues.push({p,reason:'重复期号，整期隔离'});continue;}
  const r=rs[0],a=r.n.concat(r.t);
  if(!Number.isInteger(p)||p<1||r.n.length!==6||a.some(x=>!Number.isInteger(x)||x<1||x>49)||new Set(a).size!==7){issues.push({p,reason:'号码数量/范围/重复无效，整期隔离'});continue;}
  rows.push({...r});
 }
 rows.sort((a,b)=>a.p-b.p);
 const dates=new Map();for(const r of rows){if(dates.has(r.d))issues.push({p:r.p,reason:'日期重复，保留期号分析；需人工核对',other:dates.get(r.d)});dates.set(r.d,r.p);}
 const embedded=new Map((input.embeddedRows||[]).map(r=>[r.p,r]));
 const conflicts=rows.filter(r=>embedded.has(r.p)&&JSON.stringify(r.n.concat(r.t))!==JSON.stringify(embedded.get(r.p).n.concat(embedded.get(r.p).t))).map(r=>r.p);
 const dateConflicts=rows.filter(r=>embedded.has(r.p)&&r.d!==embedded.get(r.p).d).map(r=>({p:r.p,cloud:r.d,file:embedded.get(r.p).d}));
 return {rows,issues,conflicts,dateConflicts,raw:input.rows.length,fingerprint:hash(input.rows),source:input.source||'当前页面已同步数据'};
}
function mappings(maps){const lookup=k=>Object.fromEntries(Object.entries(maps[k]).flatMap(([v,ns])=>ns.map(n=>[n,v])));const z=lookup('ZM'),w=lookup('WX'),b=lookup('WV');return {z,w,b};}
function attributes(n,m){return {生肖:m.z[n],尾数:n%10,五行:m.w[n],波色:m.b[n],单双:n%2?'单':'双',大小:n>=25?'大':'小',合单双:(Math.floor(n/10)+n%10)%2?'合单':'合双',家野:['鼠','虎','兔','龙','蛇','猴'].includes(m.z[n])?'野':'家',头数:Math.floor(n/10)};}
function hyper(k,t=3){let p=0;for(let h=t;h<=6;h++)p+=choose(k,h)*choose(49-k,6-h)/choose(49,6);return p;}
function zodiacP(zs,m,threshold=5){let dp=Array.from({length:8},()=>Array(13).fill(0));dp[0][0]=1;for(const z of uniq(Object.values(m.z))){const sz=Object.values(m.z).filter(x=>x===z).length,next=Array.from({length:8},()=>Array(13).fill(0));for(let n=0;n<=7;n++)for(let h=0;h<=12;h++)if(dp[n][h])for(let k=0;k<=Math.min(sz,7-n);k++){let j=h+(k>0&&zs.includes(z)?1:0);if(j<=12)next[n+k][j]+=dp[n][h]*choose(sz,k);}dp=next;}return dp[7].slice(threshold).reduce((a,b)=>a+b,0)/choose(49,7);}
function features(rows,m){
 const zs=uniq(Object.values(m.z)),features=[];let no=Object.fromEntries(Array.from({length:49},(_,i)=>[i+1,0])),zo=Object.fromEntries(zs.map(z=>[z,0])),st={...zo};
 for(let i=0;i<rows.length;i++){
  const r=rows[i],a=r.n.concat(r.t),at=a.map(n=>attributes(n,m)),zc={},tc={};for(const z of a.map(n=>m.z[n]))zc[z]=(zc[z]||0)+1;for(const n of r.n)tc[n%10]=(tc[n%10]||0)+1;
  for(let n=1;n<=49;n++)no[n]=r.n.includes(n)?0:no[n]+1;
  for(const z of zs){zo[z]=zc[z]?0:zo[z]+1;st[z]=zc[z]?st[z]+1:0;}
 const hist=rows.slice(Math.max(0,i-29),i+1),f=Object.fromEntries(Array.from({length:49},(_,j)=>[j+1,0])),zh=Object.fromEntries(zs.map(z=>[z,0])),th=Array(10).fill(0),tailOmit=Array(10).fill(0),elementStreak={},waveStreak={};
  for(const q of hist)for(const n of q.n)f[n]++;
  for(const q of rows.slice(Math.max(0,i-5),i+1))for(const z of uniq(q.n.concat(q.t).map(n=>m.z[n])))zh[z]++;
  for(const q of rows.slice(Math.max(0,i-5),i+1))for(const n of q.n)th[n%10]++;
  for(let tail=0;tail<10;tail++){for(let j=i;j>=0;j--){if(rows[j].n.some(n=>n%10===tail))break;tailOmit[tail]++;}}
  for(const [map,out]of [[m.w,elementStreak],[m.b,waveStreak]])for(const v of uniq(Object.values(map))){out[v]=0;for(let j=i;j>=0;j--){if(!rows[j].n.concat(rows[j].t).some(n=>map[n]===v))break;out[v]++;}}
  const order=Object.keys(f).map(Number).sort((a,b)=>f[b]-f[a]||a-b),hot=order.slice(0,10),cold=order.slice(-10);
  features.push({r,a,at,zc,tc,no:{...no},zo:{...zo},st:{...st},zh,th,tailOmit,elementStreak,waveStreak,hot,cold,f,distinct:uniq(a.map(n=>m.z[n])).length,tailCount:uniq(r.n.map(n=>n%10)).length,big:r.n.filter(n=>n>=25).length,odd:r.n.filter(n=>n%2).length,sumOdd:r.n.filter(n=>(Math.floor(n/10)+n%10)%2).length,wild:r.n.filter(n=>attributes(n,m).家野==='野').length,doubles:Object.values(zc).filter(c=>c>=2).length,adj:r.n.some(n=>r.n.includes(n+1)),gap:Math.max(...r.n)-Math.min(...r.n)});
 }
 return features;
}
function universe(fs,m){
 const conditions=[],outcomes=[],zs=uniq(Object.values(m.z)),A=Array.from({length:49},(_,i)=>i+1),addC=(id,label,fn,struct=false)=>conditions.push({id,label,fn,struct}),addO=(id,label,game,pool,threshold=1)=>outcomes.push({id,label,game,pool,threshold});
 addC('all','所有相邻期',()=>true);
 const vals={生肖:zs,尾数:A.slice(0,10).map(n=>n-1),五行:uniq(Object.values(m.w)),波色:uniq(Object.values(m.b)),单双:['单','双'],大小:['大','小'],合单双:['合单','合双'],家野:['家','野'],头数:[0,1,2,3,4]};
 for(let pos=0;pos<7;pos++)for(const [k,vs] of Object.entries(vals))for(const v of vs)addC(`p${pos}:${k}:${v}`,`上期${pos===6?'特码':'正码'+(pos+1)}${k}=${v}`,f=>f.at[pos][k]===v);
 for(const [k,label,vs] of [['distinct','7码不同生肖数',[4,5,6,7]],['tailCount','正码不同尾数',[3,4,5,6]],['big','正码大数',[0,1,2,3,4,5,6]],['odd','正码单数',[0,1,2,3,4,5,6]],['sumOdd','正码合单数',[0,1,2,3,4,5,6]],['wild','正码野肖数',[0,1,2,3,4,5,6]],['doubles','至少两码的生肖数',[0,1,2,3]]])for(const v of vs)addC(`${k}:${v}`,`上期${label}=${v}`,f=>f[k]===v,true);
 addC('adj','上期正码有相邻号码',f=>f.adj,true);addC('gap30','上期正码跨度≥30',f=>f.gap>=30,true);
 for(const w of vals.五行){addC('missing:'+w,'上期正码缺'+w,f=>!f.r.n.some(n=>m.w[n]===w),true);addC('wstreak:'+w,'上期截止'+w+'五行连续≥3期',f=>f.elementStreak[w]>=3);}
 for(const b of vals.波色)addC('bstreak:'+b,'上期截止'+b+'波连续≥3期',f=>f.waveStreak[b]>=3);
 for(let tail=0;tail<10;tail++){addC('tailhot:'+tail,`上期截止尾${tail}近6期≥5码`,f=>f.th[tail]>=5);addC('tailcold:'+tail,`上期截止尾${tail}遗漏≥3期`,f=>f.tailOmit[tail]>=3);}
 for(const b of vals.波色)for(const c of [0,1,2,3,4])addC('wave:'+b+':'+c,`上期正码${b}波=${c}个`,f=>f.r.n.filter(n=>m.b[n]===b).length===c,true);
 for(const z of zs){for(const c of [0,1,2])addC('zc:'+z+c,`上期${z}出现${c===2?'至少2':c}次`,f=>c===2?(f.zc[z]||0)>=2:(f.zc[z]||0)===c);for(const [id,label,fn] of [['omit1','遗漏1～2期',f=>f.zo[z]>=1&&f.zo[z]<=2],['omit3','遗漏≥3期',f=>f.zo[z]>=3],['streak2','连续出现≥2期',f=>f.st[z]>=2],['streak4','连续出现≥4期',f=>f.st[z]>=4],['hot6','近6期出现≥4期',f=>f.zh[z]>=4],['cold6','近6期出现≤1期',f=>f.zh[z]<=1]])addC(id+z,`上期截止${z}${label}`,fn);}
 for(const z of zs){addC('doublehot:'+z,`上期${z}至少2码 且 近6期出现≥4期`,f=>(f.zc[z]||0)>=2&&f.zh[z]>=4);addC('oncehot:'+z,`上期${z}1码 且 连续出现≥2期`,f=>f.zc[z]===1&&f.st[z]>=2);}
 // Bounded, predeclared two-condition search. Never use validation labels to choose pairs.
 const structural=conditions.filter(c=>c.struct);let pairs=0;
 for(let i=0;i<structural.length;i++)for(let j=i+1;j<structural.length&&pairs<128;j++)if(structural[i].id.split(':')[0]!==structural[j].id.split(':')[0]){const a=structural[i],b=structural[j];addC('pair:'+a.id+'&'+b.id,a.label+' 且 '+b.label,f=>a.fn(f)&&b.fn(f));pairs++;}
 for(let pos=0;pos<7;pos++)for(const k of Object.keys(vals)){const pool=f=>A.filter(n=>attributes(n,m)[k]===f.at[pos][k]);for(const game of ['te','z3'])addO(`pos${pos}:${k}:${game}`,`下期${game==='te'?'特码':'6正码至少1个'}与上期${pos===6?'特码':'正码'+(pos+1)}同${k}`,game,pool);}
 for(let pos=0;pos<7;pos++)for(const d of [-12,-3,-2,-1,0,1,2,3,12])for(const game of ['te','z3'])addO(`delta${pos}:${d}:${game}`,`下期${game==='te'?'特码':'正码'}=上期${pos===6?'特码':'正码'+(pos+1)}${d>=0?'+':''}${d}`,game,f=>A.filter(n=>n===f.a[pos]+d));
 for(let pos=0;pos<7;pos++)for(const d of [1,2,3,6,12])for(const game of ['te','z3'])addO(`abs${pos}:${d}:${game}`,`下期${game==='te'?'特码':'正码'}与上期${pos===6?'特码':'正码'+(pos+1)}绝对差=${d}`,game,f=>A.filter(n=>Math.abs(n-f.a[pos])===d));
 for(const [k,vs] of Object.entries(vals))for(const v of vs){const pool=()=>A.filter(n=>attributes(n,m)[k]===v);addO('te:'+k+v,`下期特码${k}=${v}`,'te',pool);if(['生肖','尾数','五行','波色','头数'].includes(k))addO('z3:'+k+v,`下期正码包含${k}=${v}`,'z3',pool);}
 for(const z of zs)addO('lx:'+z,`下期7码包含${z}`,'lx',()=>[z]);
 for(let i=0;i<zs.length;i++)for(let j=i+1;j<zs.length;j++)addO('lxpair:'+zs[i]+zs[j],`下期7码同时包含${zs[i]}、${zs[j]}`,'lx',()=>[zs[i],zs[j]],2);
 for(const k of [2,3,4,5,6])addO('lxretain:'+k,`下期至少保留上期${k}个生肖`,'lx',f=>uniq(f.a.map(n=>m.z[n])),k);
 for(const k of [6,7])addO('lxdistinct:'+k,`下期7码至少${k}个不同生肖`,'lx',()=>zs,k);
 for(const size of [5,6,8,12])for(const strategy of ['frequency','cold','omission','complement']){const pool=f=>A.slice().sort((a,b)=>{const score=n=>strategy==='frequency'?f.f[n]:strategy==='cold'?-f.f[n]:strategy==='omission'?f.no[n]:(f.r.n.some(x=>m.z[x]===m.z[n])&&!f.r.n.includes(n)?10:0)+f.f[n]/10;return score(b)-score(a)||a-b;}).slice(0,size);addO(`fixedpool:${strategy}:${size}`,`下期至少3正码在${strategy==='frequency'?'近30期热度':strategy==='cold'?'近30期冷度':strategy==='omission'?'遗漏': '上期同肖换号'}前${size}码池`,'z3',pool,3);}
 const pools=[['repeat','上期6正码原号',f=>f.r.n],['unseen','上期未出现正码',f=>A.filter(n=>!f.r.n.includes(n))],['samez','上期正码同生肖',f=>A.filter(n=>f.r.n.some(x=>m.z[x]===m.z[n]))],['complement','上期同生肖换号码',f=>A.filter(n=>!f.r.n.includes(n)&&f.r.n.some(x=>m.z[x]===m.z[n]))],['doubleComplement','上期重复生肖剩余号码',f=>A.filter(n=>(f.zc[m.z[n]]||0)>=2&&!f.a.includes(n))],['sametail','上期正码同尾',f=>A.filter(n=>f.r.n.some(x=>x%10===n%10))],['hot10','近30期次数前10码',f=>f.hot],['cold10','近30期次数后10码',f=>f.cold],['omit','正码遗漏≥10期',f=>A.filter(n=>f.no[n]>=10)],['adjacent','上期正码邻号',f=>A.filter(n=>f.r.n.some(x=>Math.abs(n-x)===1))],['missingHead','上期缺头号码',f=>A.filter(n=>!f.r.n.some(x=>Math.floor(x/10)===Math.floor(n/10)))]];
 for(const d of [1,2,3])pools.push(['tail'+d,`上期正码尾数±${d}（循环0～9）`,f=>A.filter(n=>f.r.n.some(x=>Math.min(Math.abs(n%10-x%10),10-Math.abs(n%10-x%10))===d))]);
 for(const [id,label,pool] of pools){addO('poolte:'+id,'下期特码在'+label,'te',pool);addO('pool3:'+id,'下期至少3个正码在'+label,'z3',pool,3);}
 for(const [id,label,pool] of [['prev','上期7码生肖',f=>uniq(f.a.map(n=>m.z[n]))],['absent','上期未出生肖',f=>zs.filter(z=>!f.zc[z])],['once','上期只出1码生肖',f=>zs.filter(z=>f.zc[z]===1)],['twice','上期重复生肖',f=>zs.filter(z=>f.zc[z]>=2)],['hot','近6期最热6肖',f=>zs.slice().sort((a,b)=>f.zh[b]-f.zh[a]||zs.indexOf(a)-zs.indexOf(b)).slice(0,6)],['cold','近6期最冷6肖',f=>zs.slice().sort((a,b)=>f.zh[a]-f.zh[b]||zs.indexOf(a)-zs.indexOf(b)).slice(0,6)]])addO('lxpool:'+id,'下期至少5肖包含于'+label,'lx',pool,5);
 return {conditions,outcomes,pairs};
}
const logFact=[0];function lf(n){while(logFact.length<=n)logFact.push(logFact.at(-1)+Math.log(logFact.length));return logFact[n];}
const lc=(n,k)=>k<0||k>n?-Infinity:lf(n)-lf(k)-lf(n-k),fcache=new Map();
function fisher(a,b,c,d){const key=[a,b,c,d].join(',');if(fcache.has(key))return fcache.get(key);const n=a+b+c+d,r=a+b,s=a+c,lp=x=>lc(s,x)+lc(n-s,r-x)-lc(n,r),obs=lp(a);let p=0;for(let x=Math.max(0,r-(n-s));x<=Math.min(r,s);x++)if(lp(x)<=obs+1e-9)p+=Math.exp(lp(x));p=Math.min(1,p);fcache.set(key,p);return p;}
function bh(items,key,out){let sorted=items.slice().sort((a,b)=>a[key]-b[key]),q=1;for(let i=sorted.length-1;i>=0;i--){q=Math.min(q,sorted[i][key]*sorted.length/(i+1));sorted[i][out]=q;}}
function stats(mask,ys,base,start,end){let n=0,h=0,rest=0,rh=0,e=0,total=0,allH=0;for(let i=start;i<end;i++){total++;allH+=ys[i];if(mask[i]){n++;h+=ys[i];e+=base[i];}else{rest++;rh+=ys[i];}}const rate=n?h/n:null,emp=total?allH/total:null,ref=rest?rh/rest:emp,p0=n?e/n:null;return {n,h,rate,baseline:emp,comparison:ref,random:p0,pp:rate===null?null:100*(rate-emp),lift:emp&&rate!==null?rate/emp:null,randomPP:rate===null?null:100*(rate-p0),shrunken:n?(h+PRIOR*ref)/(n+PRIOR):null,p:n&&rest?fisher(h,n-h,rh,rest-rh):1,rest};}
function randomP(s){if(!s.n||s.random===null)return 1;let r=s.rate,p=s.random;if(r===p)return 1;if(p===0||p===1)return r===p?1:0;const kl=(r?r*Math.log(r/p):0)+(r<1?(1-r)*Math.log((1-r)/(1-p)):0);return Math.min(1,2*Math.exp(-s.n*kl));}
function run(input,maps){
 const quality=prepare(input),rows=quality.rows,m=mappings(maps),fs=features(rows,m),trans=[];
 for(let i=29;i<rows.length-1;i++)if(rows[i+1].p===rows[i].p+1)trans.push({f:fs[i],next:rows[i+1]});else quality.issues.push({p:rows[i].p,reason:'下一期缺失，跳过该转移'});
 const N=trans.length,cut=input.trainingEndPeriod?trans.filter(t=>t.next.p<=input.trainingEndPeriod).length:Math.floor(N*.7),U=universe(fs,m),masks=U.conditions.map(c=>trans.map(t=>+c.fn(t.f))),endpoints=[];const zpcache=new Map();
 for(const o of U.outcomes){let ps=[],ys=[],sizes=[];for(const t of trans){let pool=uniq(o.pool(t.f)),k=pool.length,p=0;if(o.game==='te'){p=k/49;ys.push(+pool.includes(t.next.t));}else if(o.game==='z3'){p=hyper(k,o.threshold);ys.push(+(t.next.n.filter(n=>pool.includes(n)).length>=o.threshold));}else{let znext=uniq(t.next.n.concat(t.next.t).map(n=>m.z[n]));ys.push(+(znext.filter(z=>pool.includes(z)).length>=o.threshold));let key=o.threshold+':'+pool.slice().sort().join('');if(!zpcache.has(key))zpcache.set(key,o.threshold===1?1-choose(49-Object.values(m.z).filter(z=>pool.includes(z)).length,7)/choose(49,7):zodiacP(pool,m,o.threshold));p=zpcache.get(key);}ps.push(p);sizes.push(k);}endpoints.push({o,ps,ys,sizes});}
 const historicalN=input.historicalEndPeriod?trans.filter(t=>t.next.p<=input.historicalEndPeriod).length:N;
 const rules=[];
 for(let ci=0;ci<U.conditions.length;ci++){const mask=masks[ci],cn=mask.slice(0,cut).reduce((a,b)=>a+b,0);if(cn<MIN_TRAIN||(ci&&cut-cn<MIN_TRAIN))continue;
  for(const ep of endpoints){let tr=stats(mask,ep.ys,ep.ps,0,cut);const dir=tr.rate>(ci?tr.comparison:tr.random)?1:-1;const rp=randomP(tr);let p=ci?Math.max(tr.p,rp):rp;rules.push({id:U.conditions[ci].id+'>'+ep.o.id,ci,ep,train:tr,p,direction:dir});}
 }
 bh(rules,'p','q');const finalists=rules.filter(r=>r.q<=.05/3);for(const r of finalists){r.valid=stats(masks[r.ci],r.ep.ys,r.ep.ps,cut,historicalN);r.vp=r.ci?Math.max(r.valid.p,randomP(r.valid)):randomP(r.valid);}bh(finalists,'vp','vq');
 const walkForwardSelection=[];
 for(let j=0;j<3;j++){
  const start=cut+Math.floor((historicalN-cut)*j/3),end=cut+Math.floor((historicalN-cut)*(j+1)/3);
  const tested=rules.map(r=>{const s=stats(masks[r.ci],r.ep.ys,r.ep.ps,0,start);return {r,s,p:r.ci?Math.max(s.p,randomP(s)):randomP(s)};});bh(tested,'p','q');
  const selected=tested.filter(x=>x.q<=.05/3&&x.s.n>=MIN_TRAIN&&(!x.r.ci||x.s.rest>=MIN_TRAIN)&&(x.s.rate-(x.r.ci?x.s.comparison:x.s.random))*x.r.direction>0);
  walkForwardSelection.push({segment:j+1,trainingTargets:start,from:trans[start]?.next.p,to:trans[end-1]?.next.p,selectedRules:selected.length,ruleIds:selected.map(x=>x.r.id),note:'仅用该段之前的数据重新检验冻结的候选全集；本段结果不参与本段选择'});
 }
 const summary={version:VERSION,quality,transitions:N,warmup:29,split:{train:cut,valid:historicalN-cut,trainEnd:trans[cut-1]?.next.p,validStart:trans[cut]?.next.p,finalPeriod:rows.at(-1)?.p},enumerated:{conditions:U.conditions.length,outcomes:U.outcomes.length,twoConditions:U.pairs+24,eligibleTests:rules.length},walkForwardSelection,trainPassed:finalists.length,validated:0,scoreChanged:false};
 function detail(r){const mask=masks[r.ci],ep=r.ep,tr=r.train,v=r.valid||stats(mask,ep.ys,ep.ps,cut,historicalN),all=stats(mask,ep.ys,ep.ps,0,N),folds=[];for(let j=0;j<3;j++){let a=cut+Math.floor((historicalN-cut)*j/3),b=cut+Math.floor((historicalN-cut)*(j+1)/3);folds.push({from:trans[a]?.next.p,to:trans[b-1]?.next.p,...stats(mask,ep.ys,ep.ps,a,b)});}const adequate=v.n>=MIN_VALID&&(r.ci===0||v.rest>=MIN_VALID),same=v.rate!==null&&(v.rate-(r.ci?v.comparison:v.random))*r.direction>0,stable=folds.every(s=>s.n>=5&&(s.rate-(r.ci?s.comparison:s.random))*r.direction>0),pass=r.q<=.05/3&&r.vq<=.05/3&&adequate&&same&&stable;const recent={};for(const w of [30,50,100])recent[w]=stats(mask,ep.ys,ep.ps,Math.max(0,N-w),N);
  let reason=r.q>.05/3?'训练集多重比较/FDR未通过':!adequate?'独立验证样本不足':!same?'验证集方向反转或无提升':!(r.vq<=.05/3)?'独立验证FDR未通过':!stable?'滚动分段不稳定':'通过历史独立验证，仍须前瞻验证';
  let stability=!adequate?'证据不足':!same?'不稳定':folds.every(s=>s.n>=5&&(s.rate-(r.ci?s.comparison:s.random))*r.direction>0)?'稳定方向':(recent[50].rate-(r.ci?recent[50].comparison:recent[50].random))*r.direction<=0?'衰减':'不稳定';
  const latest=fs.at(-1),pool=ep.o.pool(latest);return {id:r.id,source:(/pool3:(repeat|samez|complement|doubleComplement|sametail|hot10|cold10|omit)|lxretain:|lxpool:prev/.test(ep.o.id)?'人工发现':'机器发现'),label:U.conditions[r.ci].label+' → '+ep.o.label,game:ep.o.game,type:r.direction>0?'追踪规律':'排除规律',status:pass?'已验证规律':r.q<=.05/3?'候选规律':'被淘汰规律',train:tr,validation:v,all,recent,forward:stats(mask,ep.ys,ep.ps,historicalN,N),walkForward:folds,trainQ:r.q,validationQ:r.vq??null,stability,reason,inScore:false,confidence:pass?'历史验证通过/等待未来期':'未验证',active:!!U.conditions[r.ci].fn(latest),candidatePool:pool,averagePoolSize:ep.sizes.reduce((a,b)=>a+b,0)/(ep.sizes.length||1),position:ep.o.id.match(/(?:pos|delta|abs)(\d)/)?.[1]??null};
 }
 // Rank on training evidence only. Never rank on validation and call it a new holdout.
 rules.sort((a,b)=>a.q-b.q||a.p-b.p||Math.abs(b.train.randomPP)-Math.abs(a.train.randomPP)||a.id.localeCompare(b.id));
 const retained=new Map();function take(filter,n){const rs=rules.filter(filter).slice(0,n);rs.forEach(r=>retained.set(r.id,r));return rs.map(r=>r.id);}
 const tops={lx:take(r=>r.ep.o.game==='lx',20),z3:take(r=>r.ep.o.game==='z3',20),te:take(r=>r.ep.o.game==='te',20),exclude:take(r=>r.direction<0,20),experiment:take(r=>r.q>.05/3,40),rejected:take(r=>r.q>.05/3,60)};finalists.forEach(r=>retained.set(r.id,r));
 rules.filter(r=>r.ci===0&&r.ep.o.id.startsWith('fixedpool:')).forEach(r=>retained.set(r.id,r));
 const detailed=[...retained.values()].map(detail);summary.validated=detailed.filter(r=>r.status==='已验证规律').length;
 const positions=[];for(let pos=0;pos<7;pos++){const best=rules.find(r=>r.ep.o.id.match(/(?:pos|delta|abs)(\d)/)?.[1]===String(pos));if(best){retained.set(best.id,best);let d=detail(best);if(!detailed.some(r=>r.id===d.id))detailed.push(d);positions.push({position:pos===6?'特码':'正码'+(pos+1),ruleId:d.id,trainQ:d.trainQ,validation:d.validation,reason:d.reason});}}
 return {...summary,tops,rules:detailed,positions,featureCatalog:{numbers:'位置原号、大小、单双、合单双、头尾、差/绝对差、相邻、冷热30期、正码遗漏',zodiac:'7码生肖计数、重复生肖数、同肖换号、剩余号码、近6期热度、连续/遗漏、家野',tail:'同尾、循环邻尾±1/2/3、尾数数量/次数',elements:'号码五行、缺失五行、位置五行、波色数量/位置波色',structure:'大小/单双/合单双/家野/波色计数、不同生肖/尾数、跨度'},limitations:['生肖映射沿用项目2026表；非2026记录不能混入。','正码位置按录入次序，未证实为真实摇出顺序；不能解释为摇奖位置因果。','初始29条只作历史预热，不参加目标检验；缺期不跨接。','FDR为每彩种BH后阈值0.05/3，覆盖三彩研究；不保证任一单条规律真实。','相邻期依赖、人工录入偏差和历史修订仍可能影响检验；通过者仍需冻结后前瞻验证。','全历史与近30/50/100仅描述；发现仅前70%，候选冻结后后30%独立验证及三个前向分段。','排名基于训练证据，不表示已经有效；无合格规律时不提供硬排除。','概率基准是假设49码无放回均匀抽取；同时报告实际无条件基准与非条件组对照。','冷热并列按号码升序确定；遗漏遇缺期为观测下界。','三中三只用下期6正码；五连肖事件使用下期7码生肖去重。','尚未完成可通过检验规则驱动的5/6/8/12码池模型；无验证信号时禁止声称改善覆盖。']};
}
root.LotteryDiscovery={run,prepare,features,hash,fisher,hyper,zodiacP,mappings,VERSION};if(typeof module!=='undefined')module.exports=root.LotteryDiscovery;
})(typeof self!=='undefined'?self:globalThis);
