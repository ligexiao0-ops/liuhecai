"""Keep one runner for the evening window; late slots are marked, never invented."""
import datetime,json,os,subprocess,sys,time
from pathlib import Path
ZONE=datetime.timezone(datetime.timedelta(hours=8))
ROOT=Path(__file__).resolve().parents[1]
def plan(day):
 return [datetime.datetime.combine(day,datetime.time(h,m),ZONE) for h,m in [(19,0),(19,30),(20,0),(20,30),(21,0),(21,30),(21,35)]]
def decision(slot,now):
 delay=(now-slot).total_seconds()
 return 'wait' if delay<0 else 'collect' if delay<=(600 if slot.hour==21 and slot.minute==35 else 240) else 'missed'
def main():
 current=datetime.datetime.now(ZONE);day=current.date() if current.hour>=18 else current.date()-datetime.timedelta(days=1);log=ROOT/'betting-data/evening-log'/(day.isoformat()+'.json');log.parent.mkdir(parents=True,exist_ok=True)
 status=json.loads(log.read_text(encoding='utf-8')) if log.exists() else {'date':day.isoformat(),'timezone':'Asia/Shanghai','slots':[]}
 if status.get('date')!=day.isoformat():raise ValueError('晚间日志日期不符')
 for slot in plan(day):
  if any(x.get('scheduledAt')==slot.isoformat() for x in status['slots']):continue
  while decision(slot,datetime.datetime.now(ZONE))=='wait':time.sleep(max(0,min(30,(slot-datetime.datetime.now(ZONE)).total_seconds())))
  now=datetime.datetime.now(ZONE);state=decision(slot,now);row={'scheduledAt':slot.isoformat(),'startedAt':now.isoformat(),'state':state}
  if state=='collect':
   env=dict(os.environ,BETTING_BACKFILL='0',BETTING_SLOT=slot.isoformat(),BETTING_PHASE='final' if slot.minute==35 else 'evening')
   try:
    result=subprocess.run([sys.executable,str(ROOT/'tools/collect-betting71.py')],cwd=ROOT,env=env,timeout=150)
    row.update(state='success' if result.returncode==0 else 'failed',finishedAt=datetime.datetime.now(ZONE).isoformat())
   except subprocess.TimeoutExpired:row.update(state='failed',reason='本时点采集超时，继续等待下一时点')
  status['slots'].append(row);log.write_text(json.dumps(status,ensure_ascii=False),encoding='utf-8');print(json.dumps(row),flush=True)
  index=ROOT/'betting-data/index.json'
  if index.exists():
   manifest=json.loads(index.read_text(encoding='utf-8'));manifest['eveningSchedule']=status;index.write_text(json.dumps(manifest,ensure_ascii=False),encoding='utf-8')
  if os.environ.get('GITHUB_ACTIONS')=='true':
   subprocess.run(['git','config','user.name','github-actions[bot]'],check=True)
   subprocess.run(['git','config','user.email','41898282+github-actions[bot]@users.noreply.github.com'],check=True)
   subprocess.run(['git','add','betting-data'],check=True)
   if subprocess.run(['git','diff','--cached','--quiet']).returncode:
    subprocess.run(['git','commit','-m','data: preserve evening slot '+slot.strftime('%H:%M')],check=True)
    for attempt in range(3):
     if subprocess.run(['git','pull','--rebase','origin','master']).returncode==0 and subprocess.run(['git','push','origin','HEAD:master']).returncode==0:break
     time.sleep(3)
    else:raise RuntimeError('晚间资料推送失败，停止并保留任务日志')
if __name__=='__main__':main()
