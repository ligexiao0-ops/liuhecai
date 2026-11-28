(function(root){
'use strict';
const balls=Array.from({length:49},(_,i)=>i+1),animals=[...'鼠牛虎兔龙蛇马羊猴鸡狗猪'];
const unique=a=>[...new Set(a)],mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:.5;
function choose(n,k){if(k<0||k>n)return 0;let p=1;for(let i=0;i<k;i++)p=p*(n-i)/(i+1);return p;}
function any(size,k){return 1-choose(49-size,k)/choose(49,k);}
function cleanRank(rank,domain){return unique((Array.isArray(rank)?rank:[]).map(v=>v&&typeof v==='object'?(v.value??v.n??v.z):v).filter(v=>domain.includes(v)));}
function names(snapshot,key){return (Array.isArray(snapshot?.[key])?snapshot[key]:[]).map(v=>v&&typeof v==='object'?(key==='numbers'?v.n:v.z):v);}
function marketRank(snapshot,key,domain){const values=names(snapshot,key);return values.length===domain.length&&unique(values).length===domain.length&&values.every(v=>domain.includes(v))?values:null;}
function unavailable(reason,quality={}){return {available:false,reason,H:[],F:[],R:[],facts:[],historyPools:[],bettingPools:[null,null],rankKinds:{},quality};}
function historyRows(input){
 const rows=[],by=new Map();let invalid=0,duplicates=0,conflicts=0;
 for(const source of Array.isArray(input)?input:[]){const n=Array.isArray(source?.n)?source.n.map(Number):[],t=Number(source?.t);if(n.length!==6||unique(n.concat(t)).length!==7||!n.concat(t).every(x=>Number.isInteger(x)&&balls.includes(x))){invalid++;continue;}
  const raw=source.issue??source.p,id=raw!==undefined&&Number.isFinite(Number(raw))?Number(raw):null,row={...source,n,t,_id:id};
  if(id!==null&&by.has(id)){duplicates++;const old=by.get(id);if(old.t!==t||old.n.slice().sort((a,b)=>a-b).join()!==n.slice().sort((a,b)=>a-b).join())conflicts++;continue;}
  rows.push(row);if(id!==null)by.set(id,row);
 }
 if(rows.every(r=>r._id!==null))rows.sort((a,b)=>a._id-b._id);
 return {rows,invalid,duplicates,conflicts};
}
function outcome(row,game,zod){return game==='z3'?row.n:game==='te'?[row.t]:unique(row.n.concat(row.t).map(zod));}
function features(history,game,zod){
 const domain=game==='lx'?animals:balls,window=history.slice(-30),facts=new Map(domain.map(value=>{const size=game==='lx'?balls.filter(n=>zod(n)===value).length:1,p=game==='te'?1/49:game==='z3'?6/49:any(size,7),frequency=window.filter(r=>outcome(r,game,zod).includes(value)).length;let gap=0;for(let i=history.length-1;i>=0&&!outcome(history[i],game,zod).includes(value);i--)gap++;
  return [value,{frequency,omission:gap,omissionLowerBound:gap===history.length,heat:(frequency-window.length*p)/Math.sqrt(window.length*p*(1-p)),cold:gap*-Math.log(1-p)}];}));
 const percentile=key=>new Map(domain.map(value=>{const v=facts.get(value)[key],lower=domain.filter(x=>facts.get(x)[key]<v).length,tied=domain.filter(x=>facts.get(x)[key]===v).length;return [value,(lower+(tied-1)/2)/(domain.length-1)];}));
 const hot=percentile('heat'),cold=percentile('cold'),rank=key=>domain.slice().sort((a,b)=>facts.get(b)[key]-facts.get(a)[key]||domain.indexOf(a)-domain.indexOf(b));
 return {domain,facts,base:new Map(domain.map(value=>[value,(hot.get(value)+cold.get(value))/2])),ranks:[rank('heat'),rank('cold')]};
}
function migrate(previous,current,values){if(!previous||!current)return null;return unique(values.map(value=>{const index=previous.indexOf(value);return index<0?undefined:current[index];}).filter(v=>v!==undefined));}
function generate(input,game,market={},zodOrContext){
 try{
  if(!['z3','lx','te'].includes(game))return unavailable('unsupportedGame');
  const context=zodOrContext&&typeof zodOrContext==='object'?zodOrContext:{},zod=typeof zodOrContext==='function'?zodOrContext:typeof context.zod==='function'?context.zod:null;
  if(game==='lx'){if(!zod)return unavailable('missingZodiacMapping');const mapped=balls.map(zod);if(unique(mapped).length!==12||!mapped.every(z=>animals.includes(z)))return unavailable('invalidZodiacMapping');}
  const cleaned=historyRows(input),history=cleaned.rows,quality={validHistory:history.length,invalid:cleaned.invalid,duplicates:cleaned.duplicates,conflicts:cleaned.conflicts,historyWindow:30};
  if(cleaned.conflicts)return unavailable('conflictingHistory',quality);
  if(history.length<31)return unavailable('need31HistoryRecords',quality);
  const tail=history.slice(-31);if(context.requireConsecutive!==false&&tail.every(r=>r._id!==null)&&tail.some((r,i)=>i&&r._id!==tail[i-1]._id+1))return unavailable('historyGapInLast31',quality);
  const domain=game==='lx'?animals:balls,last=history.at(-1),current=features(history,game,zod),previous=features(history.slice(0,-1),game,zod),previousValues=outcome(last,game,zod),historyPools=previous.ranks.map((rank,i)=>migrate(rank,current.ranks[i],previousValues));
  const sources=['A','B'],rankKinds={A:game==='lx'?'zodiacs':'numbers',B:game==='lx'?'zodiacs':'numbers'},sourceMarket=source=>market?.[source]||{};
  if(game==='lx'){const b=sourceMarket('B'),nowFlat=marketRank(b.now,'flatZodiacs',animals),oldFlat=marketRank(b.previous,'flatZodiacs',animals),oldAny=oldFlat||marketRank(b.previous,'zodiacs',animals);if(nowFlat&&(oldFlat||!oldAny))rankKinds.B='flatZodiacs';}
  const ranked=Object.fromEntries(sources.map(source=>{const m=sourceMarket(source),key=rankKinds[source];return [source,{now:marketRank(m.now,key,domain),previous:marketRank(m.previous,key,domain),early:marketRank(m.early,key,domain)}];})),bettingPools=sources.map(source=>migrate(ranked[source].previous,ranked[source].now,previousValues));
  quality.missingCurrent=sources.filter(source=>!ranked[source].now);quality.missingPrevious=sources.filter(source=>!ranked[source].previous);quality.missingEarly=sources.filter(source=>!ranked[source].early);
  const facts=domain.map(value=>{
   const historyMap=mean(historyPools.map(pool=>Number(pool.includes(value))));
   const bettingBySource=sources.map((source,i)=>bettingPools[i]===null?.5:Number(bettingPools[i].includes(value)));
   const coldBySource=sources.map(source=>{const r=ranked[source];return r.now?r.now.indexOf(value)/(domain.length-1):.5;});
   const declineBySource=sources.map(source=>{const r=ranked[source];return r.now&&r.early?.includes(value)? .5+(r.now.indexOf(value)-r.early.indexOf(value))/(2*(domain.length-1)):.5;});
   const bettingMap=mean(bettingBySource),marketCold=mean(coldBySource.concat(declineBySource)),base=current.base.get(value),f=current.facts.get(value);
   const marketRanks=sources.map(source=>ranked[source].now?ranked[source].now.indexOf(value)+1:null);
   const historyRanks=current.ranks.map(rank=>rank.indexOf(value)+1);
   const marketMatch=marketRanks.every(rank=>rank!==null&&rank<=10);
   const historyMatch=historyRanks.some(rank=>rank<=10)||historyMap>0;
   const overlapPriority=game==='z3'&&marketMatch&&historyMatch;
   const scoreF=.5*base+historyMap/6+bettingMap/6+(1-marketCold)/6+(overlapPriority?1/24:0);
   return {value,base,historyMap,bettingMap,marketCold,frequency:f.frequency,omission:f.omission,omissionLowerBound:f.omissionLowerBound,bettingBySource,coldBySource,declineBySource,marketRanks,historyRanks,overlapPriority,scoreH:base,scoreF,scoreR:.5*base+(1-historyMap)/6+(1-bettingMap)/6+marketCold/6};});
  const arm=key=>facts.slice().sort((a,b)=>b[key]-a[key]||domain.indexOf(a.value)-domain.indexOf(b.value)).map(r=>r.value);
  return {available:true,reason:null,H:arm('scoreH'),F:arm('scoreF'),R:arm('scoreR'),facts,historyPools,bettingPools,rankKinds,quality};
 }catch(error){return unavailable('calculationUnavailable',{message:String(error?.message||error)});}
}
function metadata(array,info){for(const [key,value]of Object.entries(info))Object.defineProperty(array,key,{value,enumerable:false,configurable:true});return array;}
function test(fn,pool){if(typeof fn!=='function')return true;try{return !!fn(Array.isArray(pool)?pool.slice():pool);}catch{return false;}}
function chooseNumberPool(rank,size,allowed,poolValid,options={}){
 const values=cleanRank(rank,balls).filter(n=>test(allowed,n)),need=Number(size),maxNodes=Math.max(1,Math.min(12000,Number(options.maxNodes)||12000));let visited=0,limited=false,best=null,bestCost=Infinity;
 const done=(reason)=>metadata(best||[],{searchLimited:limited,nodesVisited:visited,actualSize:best?.length||0,reason:best?null:reason,optimal:!!best&&!limited});
 if(!Number.isInteger(need)||need<1||need>49)return done('invalidSize');if(values.length<need)return done('insufficientAllowed');
 const top=values.slice(0,need);visited++;if(test(poolValid,top)){best=top;return done(null);}
 function visit(start,pool,cost){if(visited>=maxNodes){limited=true;return;}visited++;const remaining=need-pool.length;if(!remaining){if(cost<bestCost&&test(poolValid,pool)){best=pool.slice();bestCost=cost;}return;}if(values.length-start<remaining)return;const minimum=remaining*start+remaining*(remaining-1)/2;if(cost+minimum>=bestCost)return;
  for(let i=start;i<=values.length-remaining;i++){const nextCost=cost+i,minTail=(remaining-1)*(i+1)+(remaining-1)*(remaining-2)/2;if(nextCost+minTail>=bestCost)break;pool.push(values[i]);visit(i+1,pool,nextCost);pool.pop();if(limited)return;}
 }
 visit(0,[],0);return done(limited?'searchLimit':'noLegalCompletePool');
}
function combinations(values,size){const result=[];function walk(start,pool,cost){if(pool.length===size){result.push({pool:pool.slice(),cost});return;}for(let i=start;i<=values.length-(size-pool.length);i++){pool.push(values[i]);walk(i+1,pool,cost+i);pool.pop();}}walk(0,[],0);return result;}
function diversified(candidates,count){const chosen=[],limit=Math.max(0,Math.min(100,Math.floor(Number(count)||0)));while(chosen.length<limit&&candidates.length){let index=0,best=Infinity;for(let i=0;i<candidates.length;i++){const item=candidates[i],penalty=chosen.reduce((sum,old)=>{const overlap=item.pool.filter(v=>old.includes(v)).length;return sum+overlap*overlap;},0),score=item.cost+penalty;if(score<best){best=score;index=i;}}chosen.push(candidates.splice(index,1)[0].pool.slice());}return chosen;}
function chooseTriples(rank,pool,poolValid,tripleValid,count=6){const eligible=cleanRank(pool,balls),ranked=cleanRank(rank,balls),values=ranked.filter(n=>eligible.includes(n)).concat(eligible.filter(n=>!ranked.includes(n)));if(values.length<3)return metadata([],{actualCount:0,candidateCount:0,searchLimited:false});const candidates=combinations(values,3).filter(row=>test(poolValid,row.pool)&&test(tripleValid,row.pool)),total=candidates.length,result=diversified(candidates,count);return metadata(result,{actualCount:result.length,candidateCount:total,searchLimited:false});}
function chooseLinked(rank,count=3,valid){const values=cleanRank(rank,animals);if(values.length<5)return metadata([],{actualCount:0,candidateCount:0,searchLimited:false});const candidates=combinations(values,5).filter(row=>test(valid,row.pool)),total=candidates.length,result=diversified(candidates,count);return metadata(result,{actualCount:result.length,candidateCount:total,searchLimited:false});}
const api={version:'137-fixed',generate,chooseNumberPool,chooseTriples,chooseLinked};root.AppliedModel137=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
