"""Import only validated user-provided xgc rows, preserving any existing cloud rows."""
import json,re,urllib.request,urllib.error,datetime,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
url=re.search(r"const SUPABASE_URL='([^']+)'",html)[1]
key=re.search(r"const SUPABASE_KEY='([^']+)'",html)[1]
headers={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json'}
def request(path,data=None,prefer=None):
 h=dict(headers)
 if prefer:h['Prefer']=prefer
 req=urllib.request.Request(url+'/rest/v1/'+path,data=None if data is None else json.dumps(data).encode(),headers=h,method='GET' if data is None else 'POST')
 try:
  with urllib.request.urlopen(req,timeout=40) as r:
   body=r.read();return json.loads(body) if body else None
 except urllib.error.HTTPError as e:
  raise RuntimeError(str(e.code)+' '+e.read().decode('utf-8')[:500]) from None
def snapshot(lot):return request('lottery_records?lot_type=eq.'+lot+'&select=*&order=period.asc')
before={lot:snapshot(lot) for lot in ['xa','la','gc']}
existing=snapshot('xgc')
rows=json.loads((root/'data/xgc.json').read_text(encoding='utf-8'))
assert len(rows)==79 and all(len(set(r['n']+[r['t']]))==7 for r in rows)
payload=[dict(lot_type='xgc',period=r['p'],date=r['d'],t=r['t'],**{'n'+str(i+1):n for i,n in enumerate(r['n'])}) for r in rows]
request('lottery_records?on_conflict=lot_type,period',payload,'resolution=ignore-duplicates,return=minimal')
prefs_ok=True
try:
 prefs=request('user_prefs?lot_type=eq.xgc&select=lot_type')
 if not prefs:request('user_prefs?on_conflict=lot_type',[{'lot_type':'xgc','prefs':{'_xgcInitialized':True},'updated_at':datetime.datetime.now(datetime.timezone.utc).isoformat()}],'resolution=ignore-duplicates,return=minimal')
except RuntimeError as e:
 if 'PGRST205' not in str(e):raise
 prefs_ok=False
after=snapshot('xgc');assert all(any(x['period']==r['p'] for x in after) for r in rows)
assert all(snapshot(lot)==records for lot,records in before.items()),'Existing lotteries changed during verification; inspect before claiming isolation.'
report={'lot':'xgc','validatedFileRows':len(rows),'cloudRowsBefore':len(existing),'cloudRowsAfter':len(after),'existingLotteriesUnchanged':True,'prefsNamespace':prefs_ok,'at':datetime.datetime.now(datetime.timezone.utc).isoformat()}
(root/'tools/xgc-sync-result.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(report))
