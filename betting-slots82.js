(function(root){'use strict';
const slots=['19:00','19:30','20:00','20:30','21:00','21:30','21:35'];
function extract(record){const result={},dates=(record?.observations||[]).map(o=>o.scheduledAt?.slice(0,10)).filter(Boolean).sort(),day=record?.result?.date?.slice(0,10)||dates.at(-1);for(const o of record?.observations||[]){if(o.scheduledAt?.slice(0,10)!==day)continue;const key=o.scheduledAt?.slice(11,16),delay=(Date.parse(o.collectedAt)-Date.parse(o.scheduledAt))/1000;if(!slots.includes(key)||!Number.isFinite(delay)||delay<0||delay>60)continue;const date=new Date(Date.parse(o.collectedAt)+8*3600000).toISOString().slice(0,10);if(date!==o.scheduledAt.slice(0,10))continue;if(key==='21:35'?o.phase!=='final':o.phase!=='evening')continue;const s=record.snapshots?.find(s=>s.id===o.snapshotId);if(!s)continue;const snap={...s,numbers:s.numbers.map(x=>typeof x==='number'?x:x.n),zodiacs:s.zodiacs.map(x=>typeof x==='string'?x:x.z),collectedAt:o.collectedAt,scheduledAt:o.scheduledAt,zodiacAmounts:s.zodiacs.filter(x=>typeof x!=='string'),resultSeenAtCollection:!!o.resultSeen};if(!result[key]||Date.parse(snap.collectedAt)<Date.parse(result[key].collectedAt))result[key]=snap;}return result;}
function reports(periods,manual,zod,B){return slots.map(slot=>{
 const unique=[...new Map(periods.map(p=>[String(p.issue),p])).values()],observer=slot>='21:30',counts={total:unique.length,duplicateRows:periods.length-unique.length,missing:0,invalid:0,late:0,postResult:0,dateMismatch:0};const eligible=[];
 for(const p of unique){const snap=p.timeSlots?.[slot];if(!snap){counts.missing++;continue;}if(!B.validRanks(snap)){counts.invalid++;continue;}const delay=Date.parse(snap.collectedAt)-Date.parse(snap.scheduledAt);if(!Number.isFinite(delay)||delay<0||delay>60000||snap.scheduledAt?.slice(11,16)!==slot){counts.late++;continue;}if(!observer&&snap.resultSeenAtCollection){counts.postResult++;continue;}eligible.push(p);}
 const preview=B.analyze(eligible.map(p=>({...p,last:p.timeSlots[slot]})),manual,zod,{mode:'final'}),wrong=new Set(preview.items.filter(r=>!r.date||r.date!==r.snapshot.scheduledAt?.slice(0,10)).map(r=>String(r.issue)));counts.dateMismatch=wrong.size;
 const valid=eligible.filter(p=>!wrong.has(String(p.issue))),r=B.analyze(valid.map(p=>({...p,last:p.timeSlots[slot]})),manual,zod,{mode:'final'});
 counts.matched=r.items.length;counts.pending=r.pending.length;counts.conflicts=r.conflicts.length;counts.invalid+=r.invalid.length;
 return {slot,observer,captured:valid.length,missing:unique.length-valid.length,dateMismatch:wrong.size,counts,report:r};
 });}


root.BettingSlots82={slots,extract,reports};if(typeof module!=='undefined')module.exports=root.BettingSlots82;
})(typeof window==='undefined'?globalThis:window);
