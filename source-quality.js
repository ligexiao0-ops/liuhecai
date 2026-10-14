(function(root){'use strict';const W=root.WebTextRules||(typeof require==='function'?require('./web-text-rules'):null),uniq=a=>[...new Set(a)];
function number(v){if(/^\d+$/.test(v))return +v;if(v.includes('十')){const [a,b]=v.split('十');return (a?'一二三四五六七八九'.indexOf(a)+1:1)*10+(b?'一二三四五六七八九'.indexOf(b)+1:0);}return '一二三四五六七八九'.indexOf(v)+1;}
function extract(e){if(e.status==='pending'||e.struck)return null;let title=W.normalize(e.title).replace(/\((\d+)\)(?=[码肖尾头波])/g,'$1'),body=W.normalize(e.predictionText).replace(/\((\d+)\)(?=[码肖尾头波])/g,'$1');const parsed=W.parse(e.period+'期：'+title+'\n'+body,e.period)[0];if(!parsed)return null;let claim={...parsed};const brackets=[...body.matchAll(/[【\[《（(]([^】\]》）)]+)[】\]》）)]/g)],numeric=brackets.filter(m=>/^[\d\s.,，、;；-]+$/.test(m[1])&&!/^[码肖尾头波]/.test(body.slice(m.index+m[0].length))).map(m=>m[1]);
if(/码/.test(title)&&numeric.some(x=>/(?<!\d)\d{2}(?!\d)/.test(x))){claim.kind='号码';claim.values=uniq((numeric.join(' ').match(/(?<!\d)\d{1,2}(?!\d)/g)||[]).map(Number).filter(n=>n>0&&n<=49));}
if(!claim.values.length)return null;const zodiacGroups=brackets.filter(m=>/^[鼠牛虎兔龙蛇马羊猴鸡狗猪\s.,，、-]+$/.test(m[1])).map(m=>m[1]);const zs=zodiacGroups.length?uniq(zodiacGroups.join('').match(/[鼠牛虎兔龙蛇马羊猴鸡狗猪]/g)||[]):e.zodiacs||[];
for(const m of title.matchAll(/([0-9]+|[一二三四五六七八九十]+)([码肖尾头波])/g)){const expected=number(m[1]);if(m[2]==='码'&&claim.kind==='号码'&&claim.values.length!==expected)return null;if(m[2]==='肖'&&zs.length!==expected)return null;const kind={尾:'尾数',头:'头数',波:'波色'}[m[2]];if(kind&&claim.kind.includes(kind)&&!/^\d+$/.test(m[1])&&claim.values.length!==expected)return null;}
return claim;}
root.SourceQuality={extract};if(typeof module!=='undefined')module.exports=root.SourceQuality;
})(typeof window==='undefined'?globalThis:window);
