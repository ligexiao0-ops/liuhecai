const assert=require('assert'),P=require('../prediction-review'),G=require('../combo-limits');
const draw={n:[1,13,25,37,49,2],t:3},gz=n=>'鼠牛虎兔龙蛇马羊猴鸡狗猪'[(6-(n-1)%12+12)%12];
assert(!P.score({game:'pt',pool:[gz(3)]},draw,gz).success);assert(P.score({game:'te',pool:[3]},draw,gz).success);assert(P.score({game:'pt',pool:[gz(1)]},draw,gz).success);
assert(P.score({game:'lx',pool:[gz(1),gz(2),gz(3)]},draw,gz).success);
const rules=G.parse('【鼠牛虎兔龙蛇】[马羊猴鸡狗猪]');assert(rules.every(r=>r.min===2&&r.max===4));assert(!G.allowed(['鼠','牛','虎','兔','龙'],rules));assert(G.allowed(['鼠','牛','虎','马','羊'],rules));
console.log('PASS normal-only PT vs TE and 7-ball linked rules; default pasted 5/6-zodiac groups require 2–4 hits.');
