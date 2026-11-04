import datetime,importlib.util
from pathlib import Path
r=Path(__file__).resolve().parents[1]
def module(name,path):
 spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
e=module('evening',r/'tools/evening-archive80.py');c=module('collector',r/'tools/collect-betting71.py')
slots=e.plan(datetime.date(2026,11,4));assert [s.strftime('%H:%M') for s in slots]==['19:00','19:30','20:00','20:30','21:00','21:30','21:35'];assert slots[0].astimezone(datetime.timezone.utc).hour==11
assert e.decision(slots[0],slots[0]-datetime.timedelta(seconds=1))=='wait';assert e.decision(slots[0],slots[0]+datetime.timedelta(minutes=3))=='collect';assert e.decision(slots[0],slots[0]+datetime.timedelta(minutes=5))=='missed'
s={'id':'same','numbers':[{'n':i,'money':1} for i in range(1,50)],'zodiacs':[{'z':z,'money':1} for z in '鼠牛虎兔龙蛇马羊猴鸡狗猪'],'websiteUpdatedAt':'2026-11-04 20:00:00','collectedAt':'2026-11-04T12:00:03+00:00','resultSeenAtCollection':False,'zodiac2026Verified':True}
o={'scheduledAt':slots[2].isoformat(),'collectedAt':'2026-11-04T12:00:03+00:00','phase':'evening','snapshotId':'same','resultSeen':False};record={'snapshots':[s],'observations':[o]};assert c.evening_last(record)['scheduledAt']==o['scheduledAt'];record['observations'].append({**o,'scheduledAt':slots[3].isoformat(),'collectedAt':'2026-11-04T12:30:03+00:00'});assert c.evening_last(record)['collectedAt']=='2026-11-04T12:30:03+00:00'
assert c.evening_last({'snapshots':[s],'observations':[{**o,'phase':'final'}]}) is None;assert c.evening_last({'snapshots':[s],'observations':[{**o,'resultSeen':True}]}) is None;assert c.evening_last({'snapshots':[s],'observations':[{**o,'collectedAt':'2026-11-04T13:36:00+00:00'}]}) is None;assert c.evening_last({'snapshots':[s]}) is None
print('PASS Beijing six pre-draw slots and final slot; late/missed boundaries; unchanged content keeps actual observations; post-result, final and late snapshots excluded from evening forecasts; historical data not fabricated.')
