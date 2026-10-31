"""Read the public page's own APIs through a normal browser; never bypass access controls."""
import asyncio,datetime,json,hashlib,os,sys,math
from pathlib import Path
PAGE='https://img.www9tk.com/49/index.html'
API='https://api365.datakj.app/'
ANIMALS=list('鼠牛虎兔龙蛇马羊猴鸡狗猪')
OUT=Path(os.environ.get('BETTING_DATA_DIR','betting-data'))
BACKFILL=min(30,max(0,int(os.environ.get('BETTING_BACKFILL','5'))))
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def load(path,default):
    try:return json.loads(path.read_text(encoding='utf-8'))
    except (FileNotFoundError,json.JSONDecodeError):return default
def save(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    tmp=path.with_suffix('.tmp');tmp.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8');tmp.replace(path)
def result_of(raw,issue,t):
    d=raw.get('data') if isinstance(raw,dict) else None
    if not isinstance(d,dict) or not (d.get('winningNumberParse') or d.get('winningNumber') or d.get('openCode')):return None
    if int(d.get('issueNumber',issue))!=int(issue) or int(d.get('type',t))!=t:raise ValueError('开奖结果彩种/期号不符')
    a=[int(x) for x in str(d.get('winningNumberParse') or d.get('winningNumber') or d.get('openCode')).split(',')]
    if len(a)!=7 or len(set(a))!=7 or any(n<1 or n>49 for n in a):raise ValueError('开奖结果号码无效')
    date=str(d.get('createdAt') or d.get('updatedAt') or d.get('endedAt') or '')[:10]
    return {'n':a[:6],'t':a[6],'date':date,'publishedAt':d.get('createdAt'),'endedAtRaw':d.get('endedAt'),'source':API+f'lotteryDraw/queryResult/{t}/{issue}'}
def normalize(numbers,zodiacs,issue,t):
    ns=numbers.get('rows');zs=zodiacs.get('data')
    if not isinstance(ns,list) or len(ns)!=49 or not isinstance(zs,list) or len(zs)!=12:raise ValueError('未返回完整49码/12肖')
    def money(v):
        if not isinstance(v,(float,int)) or not math.isfinite(v) or v<0:raise ValueError('金额无效')
        return v
    n=[{'n':int(x['number']),'money':money(x['money'])} for x in ns]
    z=[{'z':x['zodiac'],'money':money(x['money'])} for x in zs]
    if set(x['n'] for x in n)!=set(range(1,50)) or set(x['z'] for x in z)!=set(ANIMALS):raise ValueError('号码/生肖重复或越界')
    if any(str(x.get('issue'))!=str(issue) or int(x.get('type',0))!=t for x in ns+zs):raise ValueError('榜单彩种/期号不符')
    times={x.get('updateTime') for x in ns+zs}
    if len(times)!=1 or None in times:raise ValueError('号码和生肖更新时间不一致，等待下次重取')
    n.sort(key=lambda x:-x['money']);z.sort(key=lambda x:-x['money'])
    sums={a:0 for a in ANIMALS}
    for x in n:sums[ANIMALS[(6-(x['n']-1)%12)%12]]+=x['money']
    verified=str(issue).startswith('2026') and all(abs(sums[x['z']]-x['money'])<.01 for x in z)
    gaps=[n[i-1]['money']-n[i]['money'] for i in range(1,49)]
    regular=max(gaps)-min(gaps)<=1 if gaps else False
    return {'numbers':n,'zodiacs':z,'websiteUpdatedAt':next(iter(times)),'zodiac2026Verified':verified,'regularAmountSpacing':regular,'resultSeenAtCollection':any(int(x.get('win',-1))>=0 for x in ns)}
def tiny(s):return {k:s.get(k) for k in ['id','collectedAt','websiteUpdatedAt','resultSeenAtCollection','zodiac2026Verified']}|{'numbers':[x['n'] for x in s['numbers']],'zodiacs':[x['z'] for x in s['zodiacs']]}
async def collect():
    from playwright.async_api import async_playwright
    manifest=load(OUT/'index.json',{'schemaVersion':1,'sourcePage':PAGE,'lots':{},'logs':[]})
    manifest['lastAttemptAt']=now();logs=[];success=0
    def log(path,error):
        row={'at':now(),'path':path,'message':str(error)[:500]};logs.append(row);print(json.dumps(row,ensure_ascii=False),flush=True)
    async with async_playwright() as p:
        browser=await p.chromium.launch(channel=os.environ.get('BETTING_BROWSER','chrome'),headless=True)
        page=await browser.new_page()
        from urllib.parse import urlparse
        async def route(r):await (r.continue_() if urlparse(r.request.url).hostname in ['img.www9tk.com','api365.datakj.app'] else r.abort())
        await page.route('**/*',route)
        try:
            await page.goto(PAGE,wait_until='domcontentloaded',timeout=30000)
            async def get(path):
                data=await page.evaluate("""async path=>{const r=await fetch('https://api365.datakj.app/'+path,{credentials:'omit',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('HTTP '+r.status);return r.json();}""",path)
                await asyncio.sleep(.4)
                if not isinstance(data,dict) or data.get('code',200)!=200:raise ValueError('源站返回失败状态')
                return data
            maximum=await get('HotBuyRank/maxIssue')
            for m in maximum.get('data',[]):
                t=int(m.get('type',0))
                if t not in [1,2]:continue
                lot='xa' if t==1 else 'gc';issue=int(m['issue']);period=int(m['period']);year=issue//1000
                meta=manifest['lots'].setdefault(lot,{})
                old_latest=meta.get('latestIssue')
                meta.update({'name':'新澳' if t==1 else '港彩','sourceName':m['name'],'sourceCode':m.get('code'),'sourceType':t,'latestIssue':issue,'latestPeriod':period,'mapping':'按用户指定：澳门入口=新澳；香港入口=港彩'})
                folder=OUT/lot;folder.mkdir(parents=True,exist_ok=True)
                targets=[issue];fresh=set()
                if period>1:targets.append(issue-1)
                if old_latest and old_latest not in targets:targets.append(old_latest)
                floor=int(meta.get('historyFloor',1));missing=meta.get('unavailable',{})
                backfills=0
                for q in range(period-2,floor-1,-1):
                    candidate=year*1000+q
                    if backfills>=BACKFILL:break
                    if (folder/(str(candidate)+'.json')).exists() or str(candidate) in missing:continue
                    targets.append(candidate);backfills+=1
                for q in dict.fromkeys(targets):
                    try:
                        nums=await get(f'HotBuyRank/list?pageNum=1&pageSize=100&type={t}&issue={q}')
                        zods=await get(f'HotBuyRank/zodiacRank?type={t}&issue={q}')
                        normalized=normalize(nums,zods,q,t)
                        result=None
                        try:result=result_of(await get(f'lotteryDraw/queryResult/{t}/{q}'),q,t)
                        except Exception as e:log(f'{lot}/{q}/result',e)
                        normalized['resultSeenAtCollection']=normalized['resultSeenAtCollection'] or bool(result)
                        content={'issue':q,'numbers':normalized['numbers'],'zodiacs':normalized['zodiacs'],'websiteUpdatedAt':normalized['websiteUpdatedAt']}
                        sid=hashlib.sha256(json.dumps(content,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
                        path=folder/(str(q)+'.json');record=load(path,{'issue':q,'period':q%1000,'lot':lot,'sourceType':t,'snapshots':[]})
                        if not any(s['id']==sid for s in record['snapshots']):record['snapshots'].append({'id':sid,'collectedAt':now(),'timestampPrecision':'exact',**normalized})
                        if result:
                            if record.get('result') and record['result']!=result:record.setdefault('resultChanges',[]).append({'at':now(),'previous':record['result']})
                            record['result']=result
                        save(path,record);success+=1;fresh.add(q)
                        print(json.dumps({'lot':lot,'issue':q,'snapshots':len(record['snapshots']),'hasResult':bool(record.get('result'))}),flush=True)
                        if result and result['date'] and result['date']<'2026-02-17':meta['historyFloor']=q%1000+1;break
                    except Exception as e:
                        log(f'{lot}/{q}',e)
                        if '完整49码' in str(e):missing[str(q)]=now()
                        if '429' in str(e) or '403' in str(e):raise PermissionError('源站拒绝或限流，停止本轮，不绕过限制') from e
                meta['unavailable']=missing
                summaries=[];latest=None
                for path in sorted(folder.glob('*.json')):
                    r=load(path,{})
                    if not r.get('snapshots'):continue
                    snaps=r['snapshots'];first=snaps[0];last=snaps[-1]
                    if r.get('result',{}).get('date','9999')<'2026-02-17':continue
                    retained=next((s for s in snaps if s.get('timestampPrecision','exact')=='exact' and not s.get('resultSeenAtCollection')),None)
                    summaries.append({'issue':r['issue'],'period':r['period'],'first':tiny(first),'retained':tiny(retained) if retained else None,'last':tiny(last),'result':r.get('result'),'snapshotCount':len(snaps)})
                    if r['issue']==issue:latest={'issue':issue,'period':period,'snapshot':last,'result':r.get('result'),'snapshotCount':len(snaps)}
                summaries.sort(key=lambda r:r['issue'],reverse=True);meta['periodCount']=len(summaries)
                summary={'schemaVersion':1,'lot':lot,'sourcePage':PAGE,'updatedAt':now(),'latest':latest,'periods':summaries}
                save(folder/'summary.json',summary)
                meta['latestWebsiteUpdatedAt']=latest['snapshot']['websiteUpdatedAt'] if latest else None
                meta['lastSuccessAt']=now() if issue in fresh else meta.get('lastSuccessAt')
        except Exception as e:log('collector',e)
        finally:await browser.close()
    manifest['logs']=(logs+manifest.get('logs',[]))[:40]
    manifest['status']='partial' if success and logs else 'ok' if success else 'failed'
    if success:manifest['lastSuccessAt']=now()
    save(OUT/'index.json',manifest)
    return success
if __name__=='__main__':
    try:ok=asyncio.run(collect())
    except Exception as e:
        data=load(OUT/'index.json',{'schemaVersion':1,'sourcePage':PAGE,'lots':{}});data.update({'status':'failed','lastAttemptAt':now(),'logs':[{'at':now(),'path':'browser','message':str(e)[:500]}]+data.get('logs',[])[:39]});save(OUT/'index.json',data);print(str(e),file=sys.stderr);ok=0
    sys.exit(0 if ok else 1)
