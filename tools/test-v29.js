const assert=require('assert'),fs=require('fs'),vm=require('vm'),W=require('../web-text-rules'),P=require('../prediction-review'),R=require('../random-control'),Slots=require('../source-slots');
const attr=n=>({'生肖':'鼠牛虎兔龙蛇马羊猴鸡狗猪'[(n-1)%12],'单双':n%2?'单':'双','波色':n%3?'红':'蓝','大小':n<25?'小':'大'});
const head=W.parse('286期【三个半头数】开（猴23）\n必中头数（4头双-3头单-2头双）',286)[0];assert.equal(head.kind,'头数单双');assert.deepEqual(W.pool(head,attr),[20,22,24,26,28,31,33,35,37,39,40,42,44,46,48]);assert(!W.pool(head,attr).includes(23));
const tail=W.parse('286期：杀尾【1.2.6.7】开:猴23准',286)[0];assert.equal(tail.action,'exclude');assert(W.pool(tail,attr).includes(12));assert(!W.pool(tail,attr).includes(23));
const zero=W.parse('286期：杀头【0】',286)[0];assert.deepEqual(W.pool(zero,attr),[1,2,3,4,5,6,7,8,9]);
assert.deepEqual(W.pool(W.parse('286期：杀肖【蛇】开:猴23准',286)[0],attr),[6,18,30,42]);
assert.deepEqual(W.parse('286期：八码中特【01.02.03.04.05.06.07.08】开:猴23准',286)[0].values,[1,2,3,4,5,6,7,8]);
assert.deepEqual(W.parse('286期：排除1267尾',286)[0].values,[1,2,6,7]);assert.deepEqual(W.parse('286期：杀蛇肖',286)[0].values,['蛇']);assert.deepEqual(W.parse('286期：杀蓝波',286)[0].values,['蓝']);assert(W.pool(W.parse('286期：合数【合双】',286)[0],n=>({'合数单双':n%2?'合单':'合双'})).includes(12));
assert.equal(W.parse('285期：杀肖【蛇】',286).length,0);assert.equal(W.parse('286期：特围36码【00.00.00】',286).length,0);
assert(Slots.sources.every(s=>!s.url.includes('zzyymm49347')&&!s.url.includes('blancai')));assert.equal(Slots.forLot('xa').length,2);assert.equal(Slots.forLot('la').length,3);assert.equal(Slots.forLot('gc').length,0);
const c={WebTextRules:W,getPracticeContext:()=>({attrs:attr}),activeTab:'',document:{addEventListener(){}},fetch:async()=>({ok:false,status:503}),render(){},SourceSlots:Slots};c.window=c;vm.runInNewContext(fs.readFileSync('prediction-sources-ui.js','utf8'),c);
const entry={period:286,title:'三个半头数',predictionText:'必中头数（4头双-3头单-2头双）',status:'needs_review',game:'te',numbers:[4,3,2],zodiacs:[]};assert.equal(c.PredictionSources.candidates(entry).pool.length,15);
assert.equal(c.PredictionSources.candidates({...entry,status:'pending'}),null);
for(const game of ['te','z3','lx']){const record={game,pool:game==='lx'?['鼠','牛','虎']:[12,23,34]},x=R.experiment(record,null,n=>attr(n).生肖,100,51);assert.equal(x.examples.length,100);assert(x.examples.every(e=>Array.isArray(e.own.hits)&&Array.isArray(e.control.hits)));}
const d={n:[12,1,2,3,4,5],t:23};assert(!P.score({game:'z3',pool:[12,23,34]},d,n=>attr(n).生肖).success);assert(!P.score({game:'z3',action:'exclude',pool:[12,23,34]},d,n=>attr(n).生肖).success);
console.log('PASS current-period attributes, result stripping, half-head parity, zero-head, source lot isolation, three game simulation detail and failed-triple != safe exclusion');
