(function(){'use strict';let results=[],url='https://x3gqqfku.fbaxianguohailmn123.com:3106/#49dh',period='',text='',status='',busy=false;const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const original=window.renderImg;window.renderImg=function(){return '<section class="card"><h3>🌐 网址文字识别（按预测期）</h3><p>当前彩种：'+esc(({xa:'新奥',la:'老奥',gc:'港彩'})[CUR_LOT])+'。请先确认资料属于该彩种；不自动把一个网址应用到三彩。历史期只复制核对，不应用到当前期。</p><input id="web-url" style="width:100%;box-sizing:border-box" value="'+esc(url)+'"><p>预测期 <input id="web-period" type="number" value="'+esc(period||NEXT)+'" style="width:90px"> <button data-web="load">读取网址文字</button></p><p id="web-status">'+esc(status)+'</p><textarea id="web-text" rows="6" style="width:100%;box-sizing:border-box" placeholder="也可以粘贴网页文字，例如：282期：杀尾【1】">'+esc(text)+'</textarea><button data-web="parse">按期提取并预览</button><div id="web-results"></div></section>'+original();};
function htmlText(html){const doc=new DOMParser().parseFromString(html,'text/html');doc.querySelectorAll('script,style,noscript').forEach(n=>n.remove());doc.querySelectorAll('br,li,tr,p,div,h1,h2,h3').forEach(n=>n.append('\n'));return doc.body.textContent;}
function preview(){const box=document.getElementById('web-results');if(!box)return;const c=typeof getPracticeContext==='function'?getPracticeContext(true):null;box.innerHTML=results.map((r,i)=>{const pool=WebTextRules.pool(r,c&&c.attrs);return '<article style="border-top:1px solid #ddd"><b style="color:'+(r.action==='exclude'?'#ae2828':'#167744')+'">第'+r.period+'期 · '+esc(r.label)+' · '+(r.action==='exclude'?'排除':'追踪')+'</b><p>'+esc(r.kind+'：'+r.values.join('、'))+'</p><p>'+esc(pool.join('、'))+'</p><button data-web-copy="'+i+'">复制本条（含彩种／期号）</button> '+(r.period===Number(NEXT)&&pool.length&&r.game!=='p7'?PracticalActions.buttons(pool,r.game,'网址 第'+r.period+'期 '+r.label,r.action):'<small>历史期或平特号码范围，仅核对与复制，不应用为当前期。</small>')+'</article>';}).join('')||'<p>未找到该期的明确属性和值；栏目标题、广告和开奖结果不会作为候选。</p>';}
function message(value){status=value;const el=document.getElementById('web-status');if(el)el.textContent=value;}
function update(){const el=document.getElementById('web-text');if(el)el.value=text;preview();}
function key(value){try{const u=new URL(value);return u.origin+u.pathname.replace(/\/$/,'');}catch(_){return '';}}
async function cached(u,lot,target){
 const r=await fetch('three-source-cache.json?ts='+Date.now());if(!r.ok)throw Error('来源缓存读取失败 HTTP '+r.status);
 const cache=await r.json(),source=(cache.sources||[]).find(s=>key(s.url)===key(u)||key(s.resolvedUrl)===key(u));
 if(!source)return null;
 const entries=(source.entries||[]).filter(x=>x.lot===lot),matched=entries.filter(x=>+x.period===+target);
 if(!matched.length){const periods=[...new Set(entries.map(x=>x.period))].sort((a,b)=>a-b);throw Error(periods.length?'来源'+source.source+'已有第'+periods.join('、')+'期资料，但第'+target+'期暂无可提取资料；不会用旧期资料代替':'来源'+source.source+'采集端未取得正文（'+(source.status||'未知原因')+'）。浏览器可打开不代表采集端获得同样内容');}
 return {text:source.text||matched.map(x=>x.period+'期：'+x.label+'【'+x.pool.join('、')+'】').join('\n'),results:matched.map(x=>({period:+x.period,label:x.label,kind:x.game==='lx'?'生肖':'号码',values:x.pool,game:x.game,action:x.action||'track'})),status:'已提取来源'+source.source+' 第'+target+'期 '+matched.length+'组；云端快照 '+cache.capturedAt+'，请核对期数。'};
}
document.addEventListener('click',async e=>{
 const cp=e.target.closest('[data-web-copy]');if(cp){const r=results[+cp.dataset.webCopy];if(r)navigator.clipboard.writeText(({xa:'新奥',la:'老奥',gc:'港彩'})[CUR_LOT]+'，'+r.period+'期，'+r.label+'，'+r.values.join('，')).then(()=>showClickFeedback('✅ 已复制')).catch(()=>showClickFeedback('复制失败，请手动复制'));return;}
 const b=e.target.closest('[data-web]');if(!b)return;e.preventDefault();if(busy){message('正在读取，请稍候…');return;}
 url=document.getElementById('web-url').value.trim();period=document.getElementById('web-period').value;text=document.getElementById('web-text').value;
 const lot=CUR_LOT,target=Number(period);results=[];
 try{
 if(!Number.isInteger(target)||target<1)throw Error('请填写有效预测期');
 if(b.dataset.web==='parse'){results=WebTextRules.parse(text,target);update();message('已提取 '+results.length+'条；应用前请核对彩种、期数和用途。');return;}
 busy=true;message('正在读取网址与来源缓存…');update();
 const u=new URL(url);if(!['https:','http:'].includes(u.protocol))throw Error('请使用http或https网址');
 let data=await cached(u.href,lot,target);
 if(!data){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{const r=await fetch(u.href,{signal:controller.signal,credentials:'omit'});if(!r.ok)throw Error('HTTP '+r.status);const content=await r.text();if(/<title>\s*Security\s*<\/title>/i.test(content))throw Error('采集请求收到安全校验页');const loaded=htmlText(content),parsed=WebTextRules.parse(loaded,target);if(!parsed.length)throw Error('没有读到该期明确资料，正文可能位于内嵌页面');data={text:loaded,results:parsed,status:'已直接读取并提取 '+parsed.length+'条'};}
 catch(err){const r=await fetch('website-text-cache.json?ts='+Date.now());if(!r.ok)throw err;const cache=await r.json(),page=(cache.pages||[]).find(p=>key(p.url)===key(u.href))||(key(cache.source)&&new URL(cache.source).host===u.host?{text:(cache.pages||[]).map(p=>p.text).join('\n')}:null);if(!page)throw Error('网页禁止跨站读取或需要安全校验，且暂无匹配缓存。可以粘贴网页文字提取');data={text:page.text,results:WebTextRules.parse(page.text,target),status:'云端文字快照 '+cache.capturedAt+'；不是实时读取'};}
 finally{clearTimeout(timer);}
 }
 if(CUR_LOT!==lot){message('读取期间切换了彩种，本次结果未应用；请在对应彩种重新读取。');return;}
 text=data.text;results=data.results;update();message(data.status+(results.length?'':'；该期未发现可提取资料'));
 }catch(err){message('读取／提取失败：'+err.message+'。可粘贴网页文字后提取。');try{update();}catch(_){}if(typeof showClickFeedback==='function')showClickFeedback('读取未成功，请查看网址下方原因');}
 finally{busy=false;}
});
document.addEventListener('DOMContentLoaded',()=>{const base=window.render;window.render=function(){const r=base.apply(this,arguments);if(activeTab==='img')preview();return r;};});
})();
