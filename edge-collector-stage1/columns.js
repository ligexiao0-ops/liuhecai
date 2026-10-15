(() => {
 'use strict';
 const base=SancaiDOMCollector.read, W=WebTextRules;
 const normalize=s=>W.normalize(s).replace(/複/g,'复').replace(/試/g,'试');
 const keys=/三中三|三中二|二中二|复式|复试|中特|杀|肖|码|不中|连|特码|特围|平码|尾|头|波|五行|单双|大小|家禽|野兽|合数/;
 const periodRE=/(?:20\d{2}[-年]?)?(\d{1,3})\s*期/;
 function lot(){const text=normalize(document.body?.innerText||'').slice(0,500);if(/当前[为是]?\s*老澳/.test(text))return 'la';if(/当前[为是]?\s*新澳/.test(text))return 'xa';const path=location.pathname;if(/\/(?:lam|lambbs)(?:\/|\.)/.test(path))return 'la';if(/\/(?:xam|ambbs)(?:\/|\.)/.test(path))return 'xa';if(/\/(?:xg|xgbbs)(?:\/|\.)/.test(path))return 'gc';return 'unknown';}
 function read(expected){
  const old=base(expected), records=[], notices=[];
  const nodes=[...document.querySelectorAll('tr,p,li,div')].filter(e=>e.getClientRects().length&&!e.closest('script,style,[hidden],input,textarea,[contenteditable]'));
  const blocks=nodes.filter(e=>periodRE.test(normalize(e.innerText||''))&&keys.test(normalize(e.innerText||''))).filter(e=>!nodes.some(c=>c!==e&&e.contains(c)&&periodRE.test(normalize(c.innerText||''))&&keys.test(normalize(c.innerText||''))));
  for(const block of blocks){
   let text=normalize(block.innerText||''),segments=SancaiDOMCollector.pieces(block);
   for(let n=block.nextElementSibling,i=0;n&&i<3;n=n.nextElementSibling,i++){const t=normalize(n.innerText||'');if(periodRE.test(t)||t.length>600||!t.trim())break;if(!/^[\s\d.、,，:：【】\[\]()（）鼠牛虎兔龙蛇马羊猴鸡狗猪红蓝绿金木水火土单双大小头尾波]+$/.test(t))break;text+='\n'+t;segments.push(...SancaiDOMCollector.pieces(n));}
   if(text.length>5000)continue;
   text=text.replace(/([一二三四五六七八九十2-9])连(?!肖)/g,'$1连肖').replace(/特围(?=\s*[【:：])/g,'特围号码').replace(/(\d+|[一二三四五六七八九十]+)不中/g,'杀$1码不中');
   text=text.replace(/杀特(?=\s*[:：【\[\d])/g,'杀特码');
   const periods=[...text.matchAll(new RegExp(periodRE.source,'g'))];
   for(let i=0;i<periods.length;i++){
    const period=+periods[i][1],raw=text.slice(periods[i].index,periods[i+1]?.index||text.length),body=raw.replace(periodRE,'').replace(/^\s*[:：]?\s*/,'');
    const label=body.split('\n')[0].split(/[【\[:：]/)[0].replace(/(?<!\d)\d{2}[.、，][\s\S]*$/,'').trim();
    const claims=W.parse(raw,period);
    if(!claims.length&&keys.test(label)){const pending=/(?:00[.、,，\s]*){2,}|待更新|待公布/.test(body);records.push({period,title:label||'未识别栏目',kind:'待核对',values:[],game:'te',action:'track',valid:false,pending,status:pending?'待更新':'文字格式未识别，请核对原文',raw,segments,source:location.href,lot:lot(),readAt:new Date().toISOString()});}
    for(const c of claims){
     let valid=true,status='待人工核对';const nums=/([一二三四五六七八九十百\d]+)码/.exec(c.label),zods=/([一二三四五六七八九十\d]+)肖/.exec(c.label);
     function count(s){if(/^\d+$/.test(s))return +s;const n={一:1,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9};if(s==='十')return 10;if(s.includes('十')){const [a,b]=s.split('十');return (n[a]||1)*10+(n[b]||0);}return n[s];}
     const declared=c.kind==='号码'&&nums?count(nums[1]):c.kind==='生肖'&&zods?count(zods[1]):null;
     if(declared&&declared!==c.values.length){valid=false;status='标题数量与提取数量不符';}
     const pending=/(?:00[.、,，\s]*){2,}|待更新|待公布/.test(body);if(pending){valid=false;status='待更新';}
     records.push({...c,title:c.label,valid,pending,status,raw,segments,source:location.href,lot:lot(),readAt:new Date().toISOString(),sourceAction:/杀|排除|不出/.test(c.label)?'exclude':'track'});
    }
   }
  }
  // Preserve exact nine-number parser and its per-number style markers.
  for(const r of old.records){const at=records.findIndex(x=>x.period===r.period&&x.title==='九码复式三中二');const exact={...r,kind:'号码',values:r.numbers.map(n=>n.value),game:'z3in2',action:'track',sourceAction:'track',lot:lot()};if(at>=0)records[at]=exact;else records.push(exact);}
  const latest=new Map();for(const r of records)latest.set(r.title,Math.max(latest.get(r.title)||0,r.period));
  const seen=new Set();const selected=records.filter(r=>r.period===(expected||latest.get(r.title))).filter(r=>{const k=JSON.stringify([r.title,r.period,r.values,r.pending]);if(seen.has(k))return false;seen.add(k);return true;});
  const links=[...document.querySelectorAll('a[href]')].filter(a=>keys.test(normalize(a.innerText||''))).map(a=>({title:a.innerText.trim(),url:a.href})).filter(a=>/^https?:/.test(a.url));
  return {...old,records:selected,headingCount:blocks.length,foundPeriods:[...new Set(records.map(r=>r.period))].sort((a,b)=>b-a),links:[...new Map(links.map(l=>[l.url,l])).values()],lot:lot(),notices};
 }
 SancaiDOMCollector.read=read;
})();
