import importlib.util
from pathlib import Path
p=Path(__file__).with_name('collect-betting71.py');spec=importlib.util.spec_from_file_location('c',p);c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
s={'id':'same','numbers':[{'n':i,'money':1} for i in range(1,50)],'zodiacs':[{'z':z,'money':1} for z in '鼠牛虎兔龙蛇马羊猴鸡狗猪'],'resultSeenAtCollection':False}
early={'scheduledAt':'2026-11-04T19:00:00+08:00','collectedAt':'2026-11-04T11:00:30+00:00','phase':'evening','snapshotId':'same','resultSeen':False};late={**early,'scheduledAt':'2026-11-04T19:30:00+08:00','collectedAt':'2026-11-04T11:31:01+00:00'};final={**early,'scheduledAt':'2026-11-04T21:35:00+08:00','collectedAt':'2026-11-04T13:35:30+00:00','phase':'final','resultSeen':True}
v=c.time_slots({'snapshots':[s],'observations':[early,late,final]});assert set(v)=={'19:00','21:35'};assert v['19:00']['numbers']==list(range(1,50));assert not v['19:00']['resultSeenAtCollection'];assert v['21:35']['resultSeenAtCollection'];assert not c.time_slots({'snapshots':[s]})
print('PASS collector publishes each real clock slot independently; delayed snapshots stay out of same-time statistics and old history has no invented slots.')
