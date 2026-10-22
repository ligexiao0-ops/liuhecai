(function(root){'use strict';function allowed(pool,rules){return !(rules||[]).some(r=>[...new Set(pool)].filter(x=>(r.pool||r.zods||[]).includes(x)).length>r.max);}function save(up,game,pool){const key=game==='lx'?'lx_grp_limits':'zm3_group_limits',max=game==='lx'?pool.length-1:2;up[key]=up[key]||[];const item=game==='lx'?{zods:pool.slice(),max}:{pool:pool.slice(),max};if(!up[key].some(x=>JSON.stringify(x)===JSON.stringify(item)))up[key].push(item);return max;}function parse(text){
 const normal=String(text).normalize('NFKC').replace(/[龍雞豬馬]/g,c=>({'龍':'龙','雞':'鸡','豬':'猪','馬':'马'}[c])).replace(/[零一二三四五六七八九十]/g,c=>String('零一二三四五六七八九十'.indexOf(c))),global=normal.match(/每组\s*(?:最多|上限)\s*(\d+)/),chunks=[];
 const limit='(?:最多|上限|不超过)\\s*(\\d+)\\s*个?';
 for(const line of normal.split(/\n|[;；]/)){
  const bracket=new RegExp('[【\\[（(<《]([^】\\]）)>》]+)[】\\]）)>》]\\s*(?:'+limit+')?','g');
  const matches=[...line.matchAll(bracket)];
  if(matches.length)chunks.push(...matches.map(m=>({text:m[1],max:m[2]})));
  else {const labeled=[...line.matchAll(/(?:[A-Za-z](?:组)?\s*[:：]?\s*)([鼠牛虎兔龙蛇马羊猴鸡狗猪]{2,})(?:\s*(?:最多|上限|不超过)\s*(\d+))?/g)];
   if(labeled.length)chunks.push(...labeled.map(m=>({text:m[1],max:m[2]})));
   else for(const part of line.split(/[/、,|]+/))if(part.trim())chunks.push({text:part,max:part.match(/(?:最多|上限|不超过)\s*(\d+)/)?.[1]});
  }
 }
 const out=[];for(const c of chunks){const zods=[...new Set(c.text.match(/[鼠牛虎兔龙蛇马羊猴鸡狗猪]/g)||[])];if(zods.length<2)continue;const raw=c.max??global?.[1]??(zods.length>=5?4:2),max=Math.max(0,Math.min(zods.length,Number(raw)));if(!out.some(g=>g.max===max&&g.zods.length===zods.length&&g.zods.every(z=>zods.includes(z))))out.push({zods,max});}return out;
}
root.ComboLimits={allowed,save,parse};
if(typeof document!=='undefined'){
 const preview=()=>{const input=document.getElementById('lx-grp-input'),box=document.getElementById('lx-group-preview');if(!input||!box)return;const groups=parse(input.value);box.textContent=groups.length?groups.map((g,i)=>(i+1)+'. '+g.zods.join('')+' → 最多含'+g.max+'肖（'+(g.max<g.zods.length?'禁止整组包含':'此组不限制')+'）').join('； '):'每组至少2个生肖；保存前请核对分组。';};
 document.addEventListener('input',e=>{if(e.target.id==='lx-grp-input')preview();});
 document.addEventListener('click',e=>{if(e.target.closest('[data-action="saveGrpLimits"]'))setTimeout(preview,0);});
}
if(typeof module!=='undefined')module.exports=root.ComboLimits;})(typeof window==='undefined'?globalThis:window);
