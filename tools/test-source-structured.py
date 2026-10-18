import json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent/'python-libs'))
from source_structured import parse_structured
root=Path(__file__).parent/'cloud-probe/results/tools/cloud-probe/pages'
def records(file,p):
 d=json.loads((root/(file+'.json')).read_text('utf-8'))
 return parse_structured(d['html'],d['url'],'xa',p)
b=records('c069c3b36834b1bb',288)
assert any(e['title']=='5码' and e['numbers']==[17,42,38,39,4] for e in b)
assert any(e['title']=='9肖' and len(e['zodiacs'])==9 for e in b)
assert any(e['title']=='杀10码' and len(e['numbers'])==10 and e['action']=='exclude' for e in b)
old=records('c069c3b36834b1bb',287)
assert any(e['title']=='杀10码' and e['numbers']==[21,20,6,15,23,25,8,33,27,48] for e in old)
e=records('0dc34e9dca77cdbc',288)
assert next(x for x in e if x['title']=='单数10码')['numbers']==[33,45,29,41,35,47,31,43,1,13]
assert next(x for x in e if x['title']=='双数10码')['numbers']==[2,14,12,24,6,18,28,40,10,22]
assert next(x for x in e if x['title']=='复式连肖')['game']=='lx'
assert not records('c069c3b36834b1bb',300)
print('PASS real HTML: B 5码/9肖/杀10码, E odd/even 10码/复式连肖, period isolation')

assert parse_structured('<table><tr><td>290期:【砖石5码中】01.12.23.34.45</td></tr></table>','https://example.com','xa',290)[0]['numbers']==[1,12,23,34,45]
print('PASS X码中 suffix payload without label count')
