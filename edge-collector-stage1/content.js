(() => {
  'use strict';
  const norm = s => s.replace(/複/g,'复').replace(/試/g,'试').replace(/碼/g,'码');
  const titleRE = /(?:九|9)码复[式试]三中二/;
  const forbidden = 'script,style,noscript,template,input,textarea,select,[contenteditable="true"],[hidden]';
  const visible = e => !e.closest(forbidden) && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden' && e.getClientRects().length > 0;
  function pieces(el) {
    const out=[]; const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
    for(let n; (n=walker.nextNode());) {
      const e=n.parentElement;if(!e||!visible(e))continue;
      const style=getComputedStyle(e);let strike=false,background=null;
      for(let p=e;p;p=p.parentElement){const s=getComputedStyle(p);if(/line-through/.test(s.textDecorationLine)||/^(S|DEL|STRIKE)$/.test(p.tagName))strike=true;if(!background&&s.backgroundColor!=='rgba(0, 0, 0, 0)'&&s.backgroundColor!=='transparent')background=s.backgroundColor;}
      out.push({tag:e.tagName.toLowerCase(),text:n.nodeValue,color:style.color,background,strike,marked:!!e.closest('mark'),weight:style.fontWeight});
    }return out;
  }
  function read(expected) {
    const headings=[...document.querySelectorAll('tr,td,p,li,div,section,article,h1,h2,h3,h4,span,b,strong,font')]
      .filter(e=>visible(e)&&titleRE.test(norm(e.textContent||'')))
      .filter(e=>![...e.children].some(c=>titleRE.test(norm(c.textContent||''))));
    const records=[],seen=new Set();
    for(let heading of headings){
      let block=heading;
      // Prefer the nearest complete row/paragraph, never an entire table of many periods.
      for(let p=heading.parentElement;p&&p!==document.body;p=p.parentElement){const t=norm(p.textContent||'');if((t.match(/(?:九|9)码复[式试]三中二/g)||[]).length>1)break;if(/^(TR|P|LI)$/.test(p.tagName)){block=p;break;}if(t.length>1500)break;block=p;}
      let ps=pieces(block),raw=ps.map(x=>x.text).join(''),match=norm(raw).match(titleRE);
      if(!match)continue;
      // A title and its nine numbers may occupy consecutive rows.
      for(let next=block.nextElementSibling,i=0;next&&i<3;i++,next=next.nextElementSibling){const t=norm(next.textContent||'');if(/\d{1,4}\s*期|三中[二三]|开奖|開獎/.test(t)||raw.length>2000)break;const part=pieces(next);ps.push({text:'\n'},...part);raw=ps.map(x=>x.text).join('');}
      const prefix=raw.slice(0,match.index),pm=[...prefix.matchAll(/(?:20\d{2}\s*[-年]\s*)?(\d{1,4})\s*期/g)].at(-1);
      if(!pm)continue;const period=Number(pm[1]);
      let start=match.index+match[0].length,end=raw.length;
      const after=raw.slice(start),stop=after.search(/(?:特?开\s*[:：]|特?開\s*[:：]|开奖结果|開獎結果|\d{1,4}\s*期)/);if(stop>=0)end=start+stop;
      const numbers=[];let cursor=0;
      for(const part of ps){const lo=Math.max(0,start-cursor),hi=Math.min(part.text.length,end-cursor);if(hi>lo){const text=part.text.slice(lo,hi);for(const m of text.matchAll(/(?<!\d)\d{1,2}(?!\d)/g)){numbers.push({value:Number(m[0]),raw:m[0],color:part.color,background:part.background,strike:!!part.strike,marked:!!part.marked,weight:part.weight});}}cursor+=part.text.length;}
      const pending=numbers.length>0&&numbers.every(n=>n.value===0),valid=numbers.length===9&&new Set(numbers.map(n=>n.value)).size===9&&numbers.every(n=>n.value>=1&&n.value<=49);
      const key=period+'|'+numbers.map(n=>n.value).join(',');if(seen.has(key))continue;seen.add(key);
      records.push({segments:ps,period,title:'九码复式三中二',numbers,valid,pending,raw:raw.slice(0,2500),source:location.href,readAt:new Date().toISOString(),status:pending?'待更新':valid?(numbers.some(n=>n.strike)?'有删除线，需人工核对':'9码完整，待核对'):'数量或号码异常，不能确认'});
    }
    const latest=records.length?Math.max(...records.map(r=>r.period)):null;
    return {source:location.href,title:document.title,readyState:document.readyState,readAt:new Date().toISOString(),headingCount:headings.length,foundPeriods:[...new Set(records.map(r=>r.period))].sort((a,b)=>b-a),latest,expected:expected||null,records:records.filter(r=>r.period===(expected||latest)),frames:[...document.querySelectorAll('iframe,frame')].map(f=>({src:f.src||'(无src，可能为srcdoc)',srcdoc:f.hasAttribute('srcdoc'),visible:visible(f)})),bodyTextLength:document.body?.innerText.length||0};
  }
  globalThis.SancaiDOMCollector={read,pieces};
})();
