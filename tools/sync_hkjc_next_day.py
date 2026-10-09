"""Append official HKJC completed draws on the following Beijing calendar day.
Never overwrite existing history or infer missing periods/draw dates.
"""
import argparse,gzip,json,re,urllib.request,urllib.parse
from pathlib import Path
from datetime import datetime,timedelta,timezone,date
ROOT=Path(__file__).resolve().parents[1]
TZ=timezone(timedelta(hours=8))
def request(url,method='GET',payload=None,headers=None):
 req=urllib.request.Request(url,method=method,data=None if payload is None else json.dumps(payload).encode(),headers=headers or {})
 with urllib.request.urlopen(req,timeout=30) as r:
  b=r.read();b=gzip.decompress(b) if b[:2]==b'\x1f\x8b' else b
  return json.loads(b) if b else None

def eligible_draws(raw,today):
 out=[]
 for r in raw:
  if str(r['year'])!='2026':raise ValueError('Year rollover requires reviewed schema migration')
  d=date.fromisoformat(r['drawDate'][:10]);result=r.get('drawResult') or {};ns=result.get('drawnNo') or [];t=result.get('xDrawnNo')
  if d>=today or r.get('status')!='Result':continue
  if len(ns)!=6 or len(set(ns+[t]))!=7 or any(type(n)!=int or not 1<=n<=49 for n in ns+[t]):raise ValueError('Invalid official draw')
  out.append({'lot_type':'gc','period':int(r['no']),'date':d.strftime('%m/%d'),**{f'n{i+1}':n for i,n in enumerate(ns)},'t':t})
 return sorted(out,key=lambda x:x['period'])

def plan(raw,existing,today):
 incoming=eligible_draws(raw,today);by={r['period']:r for r in existing};last=max(by,default=0);adds=[];conflicts=[]
 for r in incoming:
  old=by.get(r['period'])
  if old:
   if any(old[k]!=r[k] for k in ['date','t']+[f'n{i}' for i in range(1,7)]):conflicts.append(r['period'])
  elif r['period']>last:
   if r['period']!=last+1:raise ValueError('Gap before period '+str(r['period'])+'; do not infer history')
   prev=by.get(last)
   if prev and sorted(prev[f'n{i}'] for i in range(1,7))==sorted(r[f'n{i}'] for i in range(1,7)) and prev['t']==r['t']:raise ValueError('Identical consecutive draw requires review')
   adds.append(r);by[r['period']]=r;last=r['period']
 return adds,conflicts

def main():
 p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');a=p.parse_args();now=datetime.now(TZ)
 status={'checkedAt':now.isoformat(),'lot':'gc','source':'香港赛马会官方','mode':'next-day','enabled':True,'status':'checking','added':[],'conflicts':[],'otherLots':'新澳/老澳来源未接通，保留手工录入'}
 try:
  q=json.loads((ROOT/'tools/hkjc_query.json').read_text(encoding='utf-8'));tokens=re.findall(r'\.\.\.|[A-Za-z_][A-Za-z_0-9]*|[0-9]+|[^\s,]',q['query']);compact=''
  for t in tokens:
   if compact and re.match(r'[A-Za-z_0-9]',t) and re.search(r'[A-Za-z_0-9]$',compact):compact+=' '
   compact+=t
  u='https://info.cld.hkjc.com/graphql/base-get/?'+urllib.parse.urlencode({'query':compact,'operationName':'marksixResult','variables':json.dumps({'lastNDraw':10,'startDate':None,'endDate':None,'drawType':'All'},separators=(',',':'))})
  result=request(u,headers={'Content-Type':'application/json','Origin':'https://bet.hkjc.com','Referer':'https://bet.hkjc.com/'})
  if result.get('errors'):raise ValueError('Official source returned GraphQL errors')
  html=(ROOT/'index.html').read_text(encoding='utf-8');base=re.search(r"const SUPABASE_URL='([^']+)'",html)[1];key=re.search(r"const SUPABASE_KEY='([^']+)'",html)[1]
  headers={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json'};endpoint=base+'/rest/v1/lottery_records'
  rows=request(endpoint+'?select=lot_type,period,date,n1,n2,n3,n4,n5,n6,t&lot_type=eq.gc&order=period',headers=headers) or []
  adds,conflicts=plan(result['data']['lotteryDraws'],rows,now.date());status['conflicts']=conflicts;status['pending']=[x['period'] for x in adds]
  if a.write and adds:
   request(endpoint+'?on_conflict=lot_type,period','POST',adds,{**headers,'Prefer':'resolution=ignore-duplicates,return=representation'})
   after=request(endpoint+'?select=period,date,n1,n2,n3,n4,n5,n6,t&lot_type=eq.gc&order=period',headers=headers);by={x['period']:x for x in after}
   for x in adds:
    if any(by.get(x['period'],{}).get(k)!=x[k] for k in ['date','t']+[f'n{i}' for i in range(1,7)]):raise ValueError('Write verification/conflict for period '+str(x['period']))
   status['added']=[x['period'] for x in adds]
  status['status']='conflict' if conflicts else 'success' if a.write else 'dry-run';status['latestPeriod']=max([x['period'] for x in rows+(adds if a.write else [])],default=None);status['sourceLatestPeriod']=max([x['period'] for x in eligible_draws(result['data']['lotteryDraws'],now.date())],default=None)
 except Exception as e:
  status['status']='error';status['error']=type(e).__name__+': '+str(e);raise
 finally:
  (ROOT/'automatic-sync-status.json').write_text(json.dumps(status,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(status,ensure_ascii=False))
if __name__=='__main__':main()
