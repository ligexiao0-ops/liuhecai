(function(root){'use strict';
const API='https://api365.datakj.app/',SOURCE='https://img.www9tk.com/49/index.html',ANIMALS=[...'鼠牛虎兔龙蛇马羊猴鸡狗猪'];
function normalize(numbers,zodiacs,issue,type){
 const ns=numbers?.rows,zs=zodiacs?.data;
 if(!Array.isArray(ns)||ns.length!==49||!Array.isArray(zs)||zs.length!==12)throw Error('原站未返回完整49码和12肖，保留上次结果');
 const money=v=>{if(typeof v!=='number'||!Number.isFinite(v)||v<0)throw Error('原站金额无效');return v;};
 if(ns.concat(zs).some(x=>Number(x.issue)!==issue||Number(x.type)!==type))throw Error('号码榜与生肖榜的彩种／期号不一致');
 const n=ns.map(x=>({n:Number(x.number),money:money(x.money)})),z=zs.map(x=>({z:x.zodiac,money:money(x.money)}));
 if(n.some(x=>!Number.isInteger(x.n)||x.n<1||x.n>49)||new Set(n.map(x=>x.n)).size!==49||new Set(z.map(x=>x.z)).size!==12||z.some(x=>!ANIMALS.includes(x.z)))throw Error('原站号码／生肖重复或越界');
 const times=new Set(ns.concat(zs).map(x=>x.updateTime));
 if(times.size!==1||typeof [...times][0]!=='string'||!/^\d{4}-\d\d-\d\d[ T]\d\d:\d\d:\d\d$/.test([...times][0]))throw Error('号码榜和生肖榜更新时间不一致，请稍后重试');
 n.sort((a,b)=>b.money-a.money||a.n-b.n);z.sort((a,b)=>b.money-a.money||ANIMALS.indexOf(a.z)-ANIMALS.indexOf(b.z));
 const sums=Object.fromEntries(ANIMALS.map(a=>[a,0]));for(const x of n)sums[ANIMALS[(6-(x.n-1)%12)%12]]+=x.money;
 return {numbers:n,zodiacs:z,websiteUpdatedAt:[...times][0],zodiac2026Verified:String(issue).startsWith('2026')&&z.every(x=>Math.abs(sums[x.z]-x.money)<.01),resultSeenAtCollection:ns.some(x=>x.win!==null&&x.win!==undefined&&Number(x.win)>=0)};
}
function create({fetch:request,now=()=>Date.now()}={}){
 async function get(path){let r;try{r=await request(API+path,{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(15000)});}catch(e){throw Error(e.name==='TimeoutError'?'连接原站超时；晚间已采记录不受影响':'无法连接原站公开接口（网络或跨域限制）；晚间已采记录不受影响');}if(!r.ok)throw Error('原站返回 HTTP '+r.status+'；未绕过访问限制');const d=await r.json();if(!d||typeof d!=='object'||Number(d.code??200)!==200)throw Error('原站接口返回失败状态');return d;}
 async function direct(lot){
  if(!['xa','gc'].includes(lot))throw Error('该原站仅有新澳与港彩');const type=lot==='xa'?1:2;
  const maximum=await get('HotBuyRank/maxIssue');const matches=maximum.data?.filter(x=>Number(x.type)===type);
  if(!Array.isArray(matches)||matches.length!==1)throw Error('原站未返回唯一的本彩最新期号');
  const m=matches[0],issue=Number(m.issue),period=Number(m.period);
  if(!Number.isSafeInteger(issue)||issue<2000001||issue>2100366||!Number.isInteger(period)||period<1||period>366||issue%1000!==period)throw Error('原站最新期号格式不符');
  const [numbers,zodiacs]=await Promise.all([get('HotBuyRank/list?pageNum=1&pageSize=100&type='+type+'&issue='+issue),get('HotBuyRank/zodiacRank?type='+type+'&issue='+issue)]);
  const snapshot=normalize(numbers,zodiacs,issue,type),collectedAt=new Date(now()).toISOString();
  return {lot,issue,period,sourcePage:SOURCE,sourceApi:API,collectedAt,persisted:false,snapshot:{...snapshot,collectedAt,id:'live-'+lot+'-'+issue+'-'+collectedAt}};
 }
 async function read(lot){if(!['xa','gc'].includes(lot))throw Error('该原站仅有新澳与港彩');let serverError;for(const base of ['https://688638.top','https://network-check-production-92cd.up.railway.app']){try{const r=await request(base+'/api/betting/latest?lot='+lot,{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok){const d=await r.json().catch(()=>({}));const e=Error(d.error||'服务端 HTTP '+r.status);e.retryAt=d.retryAt;throw e;}const x=await r.json();if(x.lot!==lot||!x.snapshot||x.snapshot.numbers?.length!==49||x.snapshot.zodiacs?.length!==12||x.issue%1000!==x.period)throw Error('服务端榜单格式不符');return {...x,transport:'server'};}catch(e){serverError=e;if(/HTTP (403|429)/.test(e.message))throw e;}}try{return await direct(lot);}catch(e){throw Error('服务端与原站直连均未取得新榜单：'+serverError.message+'；'+e.message);}}
 return {read};
}
root.BettingLive85={create,normalize};if(typeof module!=='undefined')module.exports=root.BettingLive85;
})(typeof window==='undefined'?globalThis:window);
