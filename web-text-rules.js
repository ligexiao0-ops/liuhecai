(function(root){'use strict';
const uniq=a=>[...new Set(a)],keywords=/三中三|三中二|二中二|复式|复试|连码|平码|连肖|平特|肖|码|尾|头|波|五行|大小|单双|合数|家野|家禽|野兽|杀/;
function normalize(s){return String(s).normalize('NFKC').replace(/[龍雞豬馬殺碼綠藍門頭數復]/g,c=>({'龍':'龙','雞':'鸡','豬':'猪','馬':'马','殺':'杀','碼':'码','綠':'绿','藍':'蓝','門':'门','頭':'头','數':'数','復':'复'}[c])).replace(/\(([一二三四五六七八九十]+)\)(?=肖)/g,'$1');}
function parse(text,period){text=normalize(text);const out=[],matches=[...text.matchAll(/(?:20\d{2}[-年]?)?(\d{1,3})\s*期/g)];
for(let i=0;i<matches.length;i++){const m=matches[i];if(+m[1]!==+period)continue;const block=text.slice(m.index+m[0].length,matches[i+1]?.index||text.length).trim().replace(/^[：:，,]+/,'');const first=block.split('\n').find(x=>x.trim())?.trim()||'';let label=first;if(!keywords.test(label)){label=text.slice(Math.max(0,m.index-100),m.index).split('\n').filter(x=>x.trim()).at(-1)||'';}if(!keywords.test(label))continue;
let body=block.split('\n').map(line=>line.replace(/(?:特开|开奖|开)\s*[:：]?\s*[（(]?[^\n]*$/,'')).join('\n');
const heading=[...body.matchAll(/[【\[《（(]([^】\]》）)]+)[】\]》）)]/g)].map(x=>x[1]).find(x=>keywords.test(x)&&!/[鼠牛虎兔龙蛇马羊猴鸡狗猪]/.test(x)&&!/^\d+[头尾]/.test(x));
if(heading)label=heading;else label=label.replace(/(?:特开|开奖|开)[\s\S]*$/,'').replace(/[【\[《（(→:：][\s\S]*$/,'').trim()||label;
let kind=/\d\s*头\s*[单双]/.test(body)?'头数单双':/\d\s*尾\s*[单双]/.test(body)?'尾数单双':/合数|合单|合双/.test(label)?'合数':/大小|大数|小数/.test(label)?'大小':/单双|单数|双数/.test(label)?'单双':/家野|家禽|野兽/.test(label)?'家野':/五行|[金木水火土]行/.test(label)?'五行':/头/.test(label)?'头数':/尾/.test(label)?'尾数':/波/.test(label)?'波色':/码/.test(label)&&/\d{2}/.test(body)?'号码':/肖/.test(label)?'生肖':/码|三中|二中|3中|2中|复式|复试/.test(label)?'号码':null;if(!kind)continue;
const brackets=[...body.matchAll(/[【\[《（(]([^】\]》）)]+)[】\]》）)]/g)].map(x=>x[1]).filter(x=>x!==heading&&(/[鼠牛虎兔龙蛇马羊猴鸡狗猪\d红蓝绿金木水火土]/.test(x)||['大小','单双','家野','合数'].includes(kind)));
if(brackets.length)body=brackets.join(' ');else if(body.startsWith(label))body=body.slice(label.length);if(!body.trim()){const inline=label.match(/^(?:杀|排除)?([鼠牛虎兔龙蛇马羊猴鸡狗猪红蓝绿金木水火土0-9大小单双]+)(?:肖|波|尾|头|行|数)(?:中特|必出)?$/);if(inline)body=inline[1];else if(/^(?:杀|排除)?(?:合[单双]|家禽|野兽)$/.test(label))body=label.replace(/^(杀|排除)/,'');}
body=body.replace(/(?:\d+|[一二三四五六七八九十]+)\s*[码肖尾波]/g,'');let values=[];
if(kind==='头数单双'||kind==='尾数单双')values=uniq((body.match(/\d\s*[头尾]\s*[单双]/g)||[]).map(x=>x.replace(/\s/g,'')));
else if(kind==='生肖')values=uniq(body.match(/[鼠牛虎兔龙蛇马羊猴鸡狗猪]/g)||[]);
else if(kind==='波色')values=uniq(body.match(/[红蓝绿]/g)||[]);
else if(kind==='五行')values=uniq(body.match(/[金木水火土]/g)||[]);
else if(['大小','单双','家野','合数'].includes(kind))values=uniq((body.match(kind==='大小'?/[大小]/g:kind==='单双'?/[单双]/g:kind==='合数'?/(?:合)?[单双]/g:/家禽|野兽/g)||[]).map(v=>v.replace(/^合/,'')));
else values=uniq((body.match(kind==='尾数'||kind==='头数'?/\d/g:/(?<!\d)\d{1,2}(?!\d)/g)||[]).map(Number).filter(n=>kind==='号码'?n>=1&&n<=49:kind==='头数'?n<=4:n<=9));
if(!values.length||values.length>=49)continue;const game=/三中二|3中2/.test(label)?'z3in2':/二中二|2中2/.test(label)?'z2':/平码/.test(label)?'normal':/三中三|连码|3中3/.test(label)?'z3':/连肖/.test(label)?'lx':/平特/.test(label)?(kind==='生肖'?'pt':'p7'):'te',action=/杀|排除|不出|三中三|二中二|3中3|2中2|复式|复试/.test(label)?'exclude':'track';out.push({period:+period,label,kind,values,game,action});}
return out.filter((c,i,a)=>a.findIndex(x=>JSON.stringify(x)===JSON.stringify(c))===i);}
function pool(c,attrs){if(c.game==='pt'||c.game==='lx'||c.kind==='号码')return c.values.slice();return Array.from({length:49},(_,i)=>i+1).filter(n=>c.kind==='头数单双'||c.kind==='尾数单双'?c.values.some(v=>+(v[0])===(c.kind==='头数单双'?Math.floor(n/10):n%10)&&(v.at(-1)==='双'?n%2===0:n%2===1)):c.kind==='尾数'?c.values.includes(n%10):c.kind==='头数'?c.values.includes(Math.floor(n/10)):typeof attrs==='function'&&c.values.map(String).includes(c.kind==='合数'?String(attrs(n)['合数单双']??attrs(n)['合数']??'').replace(/^合/,''):String(attrs(n)[c.kind])));}
root.WebTextRules={parse,pool,normalize};if(typeof module!=='undefined')module.exports=root.WebTextRules;
})(typeof window!=='undefined'?window:globalThis);
