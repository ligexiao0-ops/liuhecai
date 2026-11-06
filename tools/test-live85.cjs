const assert=require('node:assert/strict'),{create,normalize}=require('../betting-live85.js');
const issue=2026310,type=1,stamp='2026-11-06 15:30:00',animals=[...'鼠牛虎兔龙蛇马羊猴鸡狗猪'];
function fixtures(){return {numbers:{rows:Array.from({length:49},(_,i)=>({number:i+1,money:(i*17)%49,issue,type,updateTime:stamp,win:-1}))},zodiacs:{data:animals.map((zodiac,i)=>({zodiac,money:i,issue,type,updateTime:stamp}))}};}
(async()=>{const f=fixtures(),calls=[],reader=create({now:()=>Date.parse('2026-11-06T07:30:05Z'),fetch:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>url.endsWith('maxIssue')?{data:[{issue,period:310,type}]}:url.includes('/list?')?f.numbers:f.zodiacs};}});
 const result=await reader.read('xa');assert.equal(result.issue,issue);assert.equal(result.persisted,false);assert.equal(result.snapshot.numbers.length,49);assert.equal(result.snapshot.zodiacs.length,12);assert(!result.snapshot.resultSeenAtCollection);assert(result.snapshot.numbers.every((x,i,a)=>!i||a[i-1].money>=x.money));assert.equal(result.collectedAt,'2026-11-06T07:30:05.000Z');assert(calls.every(x=>x.options.credentials==='omit'&&x.options.cache==='no-store'));assert(calls.every(x=>x.url.startsWith('https://api365.datakj.app/HotBuyRank/')));assert.equal(calls.length,3);
 for(const change of [f=>f.numbers.rows.pop(),f=>f.zodiacs.data.pop(),f=>f.numbers.rows[0].issue++,f=>f.zodiacs.data[0].type=2,f=>f.numbers.rows[0].number=2,f=>f.zodiacs.data[0].zodiac='猫',f=>f.numbers.rows[0].money=NaN,f=>f.zodiacs.data[0].updateTime='2026-11-06 16:00:00']){const g=fixtures();change(g);assert.throws(()=>normalize(g.numbers,g.zodiacs,issue,type));}
 const settled=fixtures();settled.numbers.rows[0].win=0;assert(normalize(settled.numbers,settled.zodiacs,issue,type).resultSeenAtCollection);
 await assert.rejects(()=>reader.read('la'),/仅有/);
 let blocked=0;await assert.rejects(()=>create({fetch:async()=>{blocked++;return {ok:false,status:403};}}).read('xa'),/403/);assert.equal(blocked,1);
 await assert.rejects(()=>create({fetch:async()=>{throw Error('network');}}).read('xa'),/无法连接/);
 console.log('PASS live85: complete ranks, money order, exact time, no credentials/storage, invalid/cross-lot/mixed-time rejection; 403 stops immediately. Synthetic fixtures only.');
})().catch(e=>{console.error(e);process.exitCode=1;});
