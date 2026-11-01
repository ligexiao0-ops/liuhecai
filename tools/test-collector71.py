import copy,importlib.util,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('collector71',root/'tools/collect-betting71.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
d=json.loads((root/'tools/betting-cloud-pilot71-result.json').read_text(encoding='utf-8'))
responses={r['path']:r['data'] for r in d['responses']}
tested=0
for r in d['responses']:
    path=r['path']
    if not path.startswith('HotBuyRank/list?'):continue
    from urllib.parse import parse_qs
    q=parse_qs(path.split('?')[1]);t=int(q['type'][0]);issue=int(q['issue'][0])
    z=responses[f'HotBuyRank/zodiacRank?type={t}&issue={issue}'];n=mod.normalize(r['data'],z,issue,t)
    assert len(n['numbers'])==49 and len(n['zodiacs'])==12 and n['zodiac2026Verified']
    result=mod.result_of(responses[f'lotteryDraw/queryResult/{t}/{issue}'],issue,t)
    if result:assert len(set(result['n']+[result['t']]))==7
    mixed=copy.deepcopy(z);mixed['data'][0]['updateTime']='2000-01-01 00:00:00'
    try:mod.normalize(r['data'],mixed,issue,t);raise AssertionError('Mixed timestamps accepted')
    except ValueError:pass
    bad=copy.deepcopy(r['data']);bad['rows'][0]['number']=bad['rows'][1]['number']
    try:mod.normalize(bad,z,issue,t);raise AssertionError('Duplicate number accepted')
    except ValueError:pass
    tested+=1
assert tested==4
print('PASS real cloud responses: 4 complete rankings, zodiac/number sum reconciliation, draw validation, mixed-hour rejection and duplicate-number rejection')
