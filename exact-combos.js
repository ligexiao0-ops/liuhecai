(function(root){'use strict';
const unique=a=>[...new Set(a)],key=a=>a.slice().sort((a,b)=>a-b).join(','),pairs=a=>a.flatMap((n,i)=>a.slice(i+1).map(m=>key([n,m])));
const hash=s=>{let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
const choose=(n,k)=>{let v=1;for(let i=1;i<=k;i++)v=v*(n-k+i)/i;return n<k?0:v;},run3=ns=>{const a=ns.slice().sort((a,b)=>a-b);return a.length===3&&a[2]-a[0]===2;};
const names={auto:'三路观察：同肖／五行／分散',zodiac:'同肖搭配',tail:'同尾搭配',element:'同五行搭配'};
function numberFacts(rows,zod){const f={};for(let n=1;n<=49;n++){let omission=0;for(let i=rows.length-1;i>=0&&!rows[i].n.includes(n);i--)omission++;f[n]={recent:rows.slice(-6).filter(r=>r.n.includes(n)).length,frequency:rows.slice(-30).filter(r=>r.n.includes(n)).length,omission};}const counts={};rows.slice(-7).forEach(r=>r.n.forEach(n=>counts[zod(n)]=(counts[zod(n)]||0)+1));const zs=unique(Array.from({length:49},(_,i)=>zod(i+1))),ordered=zs.slice().sort((a,b)=>(counts[b]||0)-(counts[a]||0));return {numbers:f,zodiacs:ordered.map(z=>({z,count:counts[z]||0,rank:1+ordered.filter(q=>(counts[q]||0)>(counts[z]||0)).length})),sample:rows.slice(-7).length*6};}
function describe(ns,zod,element){const z=ns.map(zod),t=ns.map(n=>n%10),e=ns.map(element),tags=[];
 for(const [values,label] of [[z,'同肖'],[t,'同尾'],[e,'同五行']]){const count=Math.max(...values.map(v=>values.filter(x=>x===v).length));if(count>=2)tags.push((count===3?'三码':'两码')+label);}
 return {tags:run3(ns)?tags.concat('三连号（保留备查）'):tags.length?tags:['分散搭配'],zodiac:new Set(z).size<3,tail:new Set(t).size<3,element:new Set(e).size<3};
}
function zodiacSupport(rows,zod){
 const all=Array.from({length:49},(_,i)=>i+1),recent=rows.slice(-60),out={};
 for(const z of unique(all.map(zod))){const size=all.filter(n=>zod(n)===z).length,baseline=1-choose(49-size,6)/choose(49,6),hits=recent.filter(r=>r.n.some(n=>zod(n)===z)).length,rate=(hits+30*baseline)/(recent.length+30);let omission=0;for(let i=rows.length-1;i>=0&&!rows[i].n.some(n=>zod(n)===z);i--)omission++;
 out[z]={z,hits,n:recent.length,baseline,rate,omission,points:Math.max(-.2,Math.min(.2,rate-baseline))};}return out;
}
function select(rows,pool,zod,element,options={}){
 const ns=unique(pool).filter(n=>Number.isInteger(n)&&n>=1&&n<=49).sort((a,b)=>a-b),recent=rows.slice(-60),frequency={},pairCounts={},tripleCounts={},priority=options.priority||null,support=zodiacSupport(rows,zod);
 for(const r of recent){for(const n of r.n)frequency[n]=(frequency[n]||0)+1;for(const p of pairs(r.n))pairCounts[p]=(pairCounts[p]||0)+1;for(let i=0;i<r.n.length;i++)for(let j=i+1;j<r.n.length;j++)for(let k=j+1;k<r.n.length;k++){const p=key([r.n[i],r.n[j],r.n[k]]);tripleCounts[p]=(tripleCounts[p]||0)+1;}}
 const candidates=[],facts=numberFacts(rows,zod);
 for(let i=0;i<ns.length;i++)for(let j=i+1;j<ns.length;j++)for(let k=j+1;k<ns.length;k++){
  const pool=[ns[i],ns[j],ns[k]];if(options.valid&&!options.valid(pool))continue;
  const structure=describe(pool,zod,element),mode=options.mode||'auto';if(mode!=='auto'&&!structure[mode])continue;
  const pp=pairs(pool),pairSupport=pp.reduce((s,p)=>s+(pairCounts[p]||0),0),joint=tripleCounts[key(pool)]||0;
  // Explicit descriptive ordering, not a fitted probability: prior marginal rank + pair support + structure.
  const marginal=pool.reduce((s,n)=>s+(priority?(priority.includes(n)?(priority.length-priority.indexOf(n))/Math.max(1,priority.length):0):((frequency[n]||0)+1)/(recent.length+8)),0),zodiacPoints=pool.reduce((s,n)=>s+support[zod(n)].points,0),structureCount=['zodiac','tail','element'].filter(p=>structure[p]).length;
  const last=rows.at(-1),near=n=>{const d=last?(n%10-last.t%10+10)%10:5;return d<=3||d>=7;},tailPoints=pool.filter(near).length*.12;
  const score=marginal+Math.min(1,pairSupport/Math.max(10,recent.length))+structureCount*.25+zodiacPoints+tailPoints;
  const reasons=[{label:'单码支持合计',value:marginal},{label:'对子同开支持',value:Math.min(1,pairSupport/Math.max(10,recent.length))},{label:'整组结构搭配',value:structureCount*.25},{label:'正码生肖支持',value:zodiacPoints}];
  const tie=root.ScoreProjects?root.ScoreProjects.tie(key(pool),rows.at(-1)?.p,options.lot||''):hash(key(pool)+'|'+rows.at(-1)?.p+'|'+(options.lot||''));
  reasons.push({label:'特尾±3软优先',value:tailPoints});
  candidates.push({pool,structure,score,pairSupport,joint,sample:recent.length,tie,run:run3(pool),support:unique(pool.map(zod)).map(z=>support[z]),facts:pool.map(n=>({n,...facts.numbers[n],zodiacRank:facts.zodiacs.find(z=>z.z===zod(n)).rank})),reasons});
 }
 const nonRuns=candidates.filter(c=>!c.run),eligible=nonRuns.length?nonRuns:candidates;eligible.sort((a,b)=>b.score-a.score||a.tie-b.tie);const out=[],usedPairs=new Set();
 const profiles=options.mode&&options.mode!=='auto'?['rank','rank','rank']:['zodiac','element','spread'];
 for(const profile of profiles){if(!eligible.length)break;const matches=x=>profile==='zodiac'?x.structure.zodiac:profile==='element'?x.structure.element:profile==='spread'?!x.structure.zodiac&&!x.structure.tail:true;const preferred=eligible.filter(matches),choices=preferred.length?preferred:eligible;const merit=x=>x.score-pairs(x.pool).filter(p=>usedPairs.has(p)).length*.5;choices.sort((a,b)=>merit(b)-merit(a)||a.tie-b.tie);const c=choices[0];eligible.splice(eligible.indexOf(c),1);c.route=profile==='zodiac'?'同肖观察':profile==='element'?'五行观察':profile==='spread'?'分散观察':'指定搭配';c.fallback=!preferred.length;out.push(c);pairs(c.pool).forEach(p=>usedPairs.add(p));}
 return out;
}
root.ExactCombos={select,describe,names,zodiacSupport,run3,numberFacts,baseline:()=>choose(6,3)/choose(49,3)};if(typeof module!=='undefined')module.exports=root.ExactCombos;
})(typeof window==='undefined'?globalThis:window);
