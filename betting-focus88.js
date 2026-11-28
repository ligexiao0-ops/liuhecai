(function(root){'use strict';
const modes=['19:00','19:30','20:00','20:30','21:00'].map(slot=>({id:'slot'+slot.replace(':',''),slot,label:slot+' · 开奖前留存'}));
function mode(value){return modes.some(m=>m.id===value)?value:'slot2100';}
function rows(periods,latestIssue,detail,S){
 return periods.map(p=>{
  if(p.issue!==latestIssue||!detail?.observations?.length)return p;
  const timeSlots={...p.timeSlots},drawDay=S.day(p.result?.date);
  for(const [slot,snapshot] of Object.entries(S.extract(detail))){
   const old=timeSlots[slot],date=S.day(snapshot.scheduledAt);
   if((!drawDay||drawDay===date)&&(!old||date>=S.day(old.scheduledAt)))timeSlots[slot]=snapshot;
  }
  return {...p,timeSlots};
 });
}
function build(periods,manual,zod,S,B,options){const reports=S.reports(periods,manual,zod,B,options);return {reports,select(value){const def=modes.find(x=>x.id===mode(value)),cohort=reports.find(x=>x.slot===def.slot);return {...cohort.report,mode:'clock',clockSlot:def.slot,focusLabel:def.label,missingClock:cohort.missing,capturedClock:cohort.captured,clockCounts:cohort.counts};}};}
function comparison(period,from='20:30',to='21:00'){const a=period?.timeSlots?.[from],b=period?.timeSlots?.[to];if(!a||!b||!a.scheduledAt||!b.scheduledAt||a.scheduledAt.slice(0,10)!==b.scheduledAt.slice(0,10))return {available:false};const sameRanks=JSON.stringify(a.numbers)===JSON.stringify(b.numbers)&&JSON.stringify(a.zodiacs)===JSON.stringify(b.zodiacs);return {available:true,sameSnapshot:!!a.id&&a.id===b.id,sameRanks,fromUpdatedAt:a.websiteUpdatedAt,toUpdatedAt:b.websiteUpdatedAt,fromCollectedAt:a.collectedAt,toCollectedAt:b.collectedAt};}
root.BettingFocus88={modes,mode,rows,build,comparison};if(typeof module!=='undefined')module.exports=root.BettingFocus88;
})(typeof window==='undefined'?globalThis:window);
