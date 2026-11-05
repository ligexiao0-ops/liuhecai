import datetime,importlib.util,tempfile,json,os
from pathlib import Path
from types import SimpleNamespace
spec=importlib.util.spec_from_file_location('e',Path(__file__).with_name('evening-archive80.py'));e=importlib.util.module_from_spec(spec);spec.loader.exec_module(e)
class Clock(datetime.datetime):
 @classmethod
 def now(cls,tz=None):return cls(2026,11,5,21,35,5,tzinfo=e.ZONE)
e.datetime=SimpleNamespace(datetime=Clock,time=datetime.time,timedelta=datetime.timedelta);e.time.sleep=lambda _:None
with tempfile.TemporaryDirectory() as tmp:
 e.ROOT=Path(tmp);calls=[];e.subprocess.run=lambda *a,**k:(calls.append(k) or SimpleNamespace(returncode=1 if len(calls)==1 else 0))
 before=os.environ.pop('GITHUB_ACTIONS',None)
 try:
  e.main();log=json.loads((e.ROOT/'betting-data/evening-log/2026-11-05.json').read_text());last=log['slots'][-1];assert last['state']=='success';assert len(last['attempts'])==2;assert all(x['state']=='missed' for x in log['slots'][:-1]);assert len(calls)==2
  e.main();assert len(calls)==2
 finally:
  if before is not None:os.environ['GITHUB_ACTIONS']=before
print('PASS failed collection retried within real slot; missed slots not backfilled; duplicate watcher idempotent. Synthetic test, no real capture.')
