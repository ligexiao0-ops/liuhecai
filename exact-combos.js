(function(root){'use strict';
const unique=a=>[...new Set(a)],key=a=>a.slice().sort((a,b)=>a-b).join(','),pairs=a=>a.flatMap((n,i)=>a.slice(i+1).map(m=>key([n,m])));
const names={auto:'综合搭配',zodiac:'同肖搭配',tail:'同尾搭配',element:'同五行搭配'};
function describe(ns,zod,element){const z=ns.map(zod),t=ns.map(n=>n%10),e=ns.map(element),tags=[];
 for(const [values,label] of [[z,'同肖'],[t,'同尾'],[e,'同五行']]){const count=Math.max(...values.map(v=>values.filter(x=>x===v).length));if(count>=2)tags.push((count===3?'三码':'两码')+label);}
 return {tags:tags.length?tags:['分散搭配'],zodiac:new Set(z).size<3,tail:new Set(t).size<3,element:new Set(e).size<3};
}
function select(rows,pool,zod,element,options={}){
 const ns=unique(pool).filter(n=>Number.isInteger(n)&&n>=1&&n<=49),recent=rows.slice(-60),frequency={},pairCounts={},tripleCounts={},priority=options.priority||ns;
 for(const r of recent){for(const n of r.n)frequency[n]=(frequency[n]||0)+1;for(const p of pairs(r.n))pairCounts[p]=(pairCounts[p]||0)+1;for(let i=0;i<r.n.length;i++)for(let j=i+1;j<r.n.length;j++)for(let k=j+1;k<r.n.length;k++){const p=key([r.n[i],r.n[j],r.n[k]]);tripleCounts[p]=(tripleCounts[p]||0)+1;}}
 const candidates=[];
 for(let i=0;i<ns.length;i++)for(let j=i+1;j<ns.length;j++)for(let k=j+1;k<ns.length;k++){
  const pool=[ns[i],ns[j],ns[k]];if(options.valid&&!options.valid(pool))continue;
  const structure=describe(pool,zod,element),mode=options.mode||'auto';if(mode!=='auto'&&!structure[mode])continue;
  const pp=pairs(pool),pairSupport=pp.reduce((s,p)=>s+(pairCounts[p]||0),0),joint=tripleCounts[key(pool)]||0;
  // Explicit descriptive ordering, not a fitted probability: prior marginal rank + pair support + structure.
  const marginal=pool.reduce((s,n)=>s+Math.max(0,priority.length-priority.indexOf(n))/Math.max(1,priority.length),0),structureCount=['zodiac','tail','element'].filter(p=>structure[p]).length;
  const score=marginal+Math.min(1,pairSupport/Math.max(10,recent.length))+structureCount*.25;
  const tie=root.ScoreProjects?root.ScoreProjects.tie(key(pool),rows.at(-1)?.p,options.lot||''):0;
  candidates.push({pool,structure,score,pairSupport,joint,sample:recent.length,tie});
 }
 candidates.sort((a,b)=>b.score-a.score||a.tie-b.tie);const out=[],usedPairs=new Set();
 while(out.length<3&&candidates.length){let best=0;for(let i=1;i<candidates.length;i++){const merit=x=>x.score-pairs(x.pool).filter(p=>usedPairs.has(p)).length*.5;if(merit(candidates[i])>merit(candidates[best]))best=i;}const c=candidates.splice(best,1)[0];out.push(c);pairs(c.pool).forEach(p=>usedPairs.add(p));}
 return out;
}
root.ExactCombos={select,describe,names};if(typeof module!=='undefined')module.exports=root.ExactCombos;
})(typeof window==='undefined'?globalThis:window);
