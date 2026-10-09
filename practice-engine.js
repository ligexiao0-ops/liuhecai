(function(root){'use strict';
const uniq=a=>[...new Set(a)],C=(n,k)=>{if(k<0||k>n)return 0;let x=1;for(let i=1;i<=k;i++)x=x*(n-k+i)/i;return x;};
function valid(ns,pairs){return !pairs.some(p=>p.filter(n=>ns.includes(n)).length>1);}
function pool(list,pairs,size,extra){let out=[];for(const n of uniq(list))if(out.length<size&&valid(out.concat(n),pairs)&&(!extra||extra(out.concat(n))))out.push(n);return out;}
function triples(ns,pairs,extra){let all=[];for(let i=0;i<ns.length;i++)for(let j=i+1;j<ns.length;j++)for(let k=j+1;k<ns.length;k++){let a=[ns[i],ns[j],ns[k]];if(valid(a,pairs)&&(!extra||extra(a)))all.push(a);}let out=[];for(const a of all)if(!out.some(b=>a.filter(n=>b.includes(n)).length>1)&&out.length<4)out.push(a);return out;}
function build(ctx){const groups=[],seen=new Set(),labels={balance:'均衡观察',continuity:'上期同肖/同尾延续',complement:'同肖换号观察',frequency:'近期与长期频率',rebound:'冷号回补观察'};
 const add=(g)=>{let id=g.game+':'+g.pool.slice().sort((a,b)=>String(a).localeCompare(String(b))).join(',');if(!g.pool.length||seen.has(id))return;seen.add(id);groups.push({...g,id});};
 for(const [strategy,list] of Object.entries(ctx.special))add({game:'te',strategy,label:labels[strategy],pool:uniq(list).filter(ctx.teAllowed).slice(0,6)});
 const wide=uniq(ctx.special.balance||[]).filter(ctx.teAllowed);add({game:'te',strategy:'wide24',label:'24码宽范围观察',pool:wide.slice(0,24)});const six=uniq(wide.map(ctx.zod)).slice(0,6);add({game:'te',strategy:'six-zodiac',label:'六肖范围观察（'+six.join('、')+'）',pool:Array.from({length:49},(_,i)=>i+1).filter(n=>ctx.teAllowed(n)&&six.includes(ctx.zod(n)))});
 for(const [strategy,list] of Object.entries(ctx.normal)){const broad=pool(list.filter(ctx.z3Allowed),ctx.noTogether,13,ctx.poolValid),eight=broad.slice(0,8);add({game:'z3',strategy,label:labels[strategy],pool:eight,broad,core:eight.slice(0,6),triples:triples(eight,ctx.noTogether,ctx.tripleValid)});}
 for(const [i,zs] of ctx.lx.entries())add({game:'lx',strategy:'structure-'+i,label:'结构备选'+(i+1),pool:uniq(zs)});
 return {meta:ctx.meta,lot:ctx.lot,groups};}
function score(group,draw,zod){const actual=group.game==='te'?[draw.t]:group.game==='z3'?draw.n:uniq(draw.n.concat(draw.t).map(zod)),hits=group.pool.filter(n=>actual.includes(n));return {hits,success:group.game==='te'?hits.length>0:group.game==='z3'?hits.length>=3:hits.length===group.pool.length&&group.pool.length===5};}
function numberBaseline(size,game){if(game==='te')return size/49;let p=0;for(let k=3;k<=Math.min(6,size);k++)p+=C(size,k)*C(49-size,6-k)/C(49,6);return p;}
root.PracticeEngine={build,score,numberBaseline,triples,pool};if(typeof module!=='undefined')module.exports=root.PracticeEngine;
})(typeof self!=='undefined'?self:globalThis);
