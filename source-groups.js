(function(root){'use strict';
function group(c){return c.action==='exclude'?'排除资料':c.game==='lx'?'连肖／复式连肖':['z3','z3in2','z2','normal'].includes(c.game)?'正码／复式组合':['pt','p7'].includes(c.game)?'平特':c.kind==='生肖'?'特码生肖':'特码号码／属性';}
// Only collapse a ladder from the same page and period when each smaller set
// is a subset of the largest. Independent zodiac predictions remain visible.
function compact(entries){return entries.filter(e=>{const c=e.claim;if(!/^([1-9]|[一二三四五六七八九])肖$/.test(e.title)||!c||c.kind!=='生肖'||c.game!=='te'||c.action==='exclude')return true;return !entries.some(other=>{const d=other.claim;return /^([1-9]|[一二三四五六七八九])肖$/.test(other.title)&&other!==e&&other.url===e.url&&other.period===e.period&&d?.kind==='生肖'&&d.game===c.game&&d.action===c.action&&d.values.length>c.values.length&&d.values.length<=9&&c.values.every(z=>d.values.includes(z));});});}
root.SourceGroups={group,compact};if(typeof module!=='undefined')module.exports=root.SourceGroups;
})(typeof window==='undefined'?globalThis:window);
