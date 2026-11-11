(function (root) {
'use strict';
const balls = Array.from({length:49}, (_,i) => i+1);
function combinations(n,k) {
  if (k<0 || k>n) return 0;
  let result=1;
  for(let i=1;i<=k;i++) result=result*(n-i+1)/i;
  return result;
}
function analyze(report,zodiac,element,any) {
  const items=report.items.filter(item=>item.zodiacEligible);
  const byIssue=new Map(items.map(item=>[Number(item.issue),item]));
  const mapping=new Map(balls.map(n=>[n,zodiac(n)]));
  const rows=items.map(item=>{
    const s=item.snapshot;
    const flat=(s.flatZodiacs||[]).map(v=>typeof v==='string'?v:v.z);
    const validFlat=flat.length===12 && new Set(flat).size===12 && flat.every(z=>s.zodiacs.includes(z));
    return {
      item, actual:zodiac(item.draw.t), normal:new Set(item.draw.n.map(zodiac)),
      number:zodiac(s.numbers[0]), aggregate:s.zodiacs[0], flat:validFlat?flat[0]:null
    };
  });
  const comparisons=[['number','aggregate','热门第1码所属肖 × 号码金额汇总第1肖'],['number','flat','热门第1码所属肖 × 独立平特第1肖'],['aggregate','flat','号码金额汇总第1肖 × 独立平特第1肖']];
  const paired=comparisons.flatMap(([left,right,label])=>[true,false].map(equal=>{
    const samples=rows.filter(row=>row[left]&&row[right]&&(row[left]===row[right])===equal);
    const tally=key=>{
      const zs=samples.map(row=>row[key]);
      return {special:samples.filter(row=>row[key]===row.actual).length,normal:samples.filter(row=>row.normal.has(row[key])).length,expectedSpecial:zs.reduce((sum,z)=>sum+balls.filter(n=>mapping.get(n)===z).length/49,0),expectedNormal:zs.reduce((sum,z)=>sum+any(balls.filter(n=>mapping.get(n)===z).length,6),0)};
    };
    return {label,equal,n:samples.length,left:tally(left),right:tally(right)};
  }));
  const elements=[...'金木水火土'].map(name=>{
    const size=balls.filter(n=>element(mapping.get(n))===name).length;
    const seen=item=>item.draw.n.some(n=>element(mapping.get(n))===name);
    const previousAbsent=items.filter(item=>{
      const previous=byIssue.get(Number(item.issue)-1);
      return previous&&!seen(previous);
    });
    return {name,size,n:items.length,normal:items.filter(seen).length,special:items.filter(item=>element(mapping.get(item.draw.t))===name).length,expectedNormal:any(size,6),previousAbsent:previousAbsent.length,reappeared:previousAbsent.filter(seen).length};
  });
  const triples=[5,10].flatMap(size=>[false,true].map(cold=>{
    const hits=report.items.map(item=>{
      const ranked=item.snapshot.numbers;
      const pool=new Set(cold?ranked.slice(-size):ranked.slice(0,size));
      return item.draw.n.filter(n=>pool.has(n)).length;
    });
    let baseline=0;
    for(let k=3;k<=6;k++) baseline+=combinations(size,k)*combinations(49-size,6-k)/combinations(49,6);
    return {size,cold,n:hits.length,hit:hits.filter(n=>n>=3).length,baseline};
  }));
  return {paired,elements,triples,n:items.length,flatN:rows.filter(row=>row.flat).length};
}
root.BettingMatch117={analyze};
if(typeof module!=='undefined')module.exports=root.BettingMatch117;
})(typeof window==='undefined'?globalThis:window);
