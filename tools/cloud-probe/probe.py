import json,asyncio,datetime
from pathlib import Path
from playwright.async_api import async_playwright
OUT=Path('cloud-probe-output');OUT.mkdir(exist_ok=True)
async def main():
    report={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'environment':'GitHub-hosted Ubuntu Chromium','responses':[],'errors':[]}
    async with async_playwright() as p:
        browser=await p.chromium.launch(channel='chrome',headless=True)
        page=await browser.new_page()
        async def route(r):
            from urllib.parse import urlparse
            await (r.continue_() if urlparse(r.request.url).hostname in ['img.www9tk.com','api365.datakj.app'] else r.abort())
        await page.route('**/*',route)
        try:
            await page.goto('https://img.www9tk.com/49/index.html',wait_until='domcontentloaded',timeout=30000)
            async def read(path):
                data=await page.evaluate("""async path=>{const r=await fetch('https://api365.datakj.app/'+path,{credentials:'omit',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('HTTP '+r.status);return r.json();}""",path)
                report['responses'].append({'path':path,'data':data});return data
            maximum=await read('HotBuyRank/maxIssue')
            for item in maximum.get('data',[]):
                if item.get('type') not in [1,2]:continue
                t=item['type'];issue=int(item['issue'])
                for period in [issue,issue-1]:
                    for path in [f'HotBuyRank/list?pageNum=1&pageSize=100&type={t}&issue={period}',f'HotBuyRank/zodiacRank?type={t}&issue={period}',f'lotteryDraw/queryResult/{t}/{period}']:
                        try:
                            data=await read(path)
                            print(json.dumps({'path':path,'code':data.get('code'),'count':len(data.get('rows') or data.get('data') or []) if isinstance(data.get('rows') or data.get('data'),list) else None},ensure_ascii=False),flush=True)
                        except Exception as e:report['errors'].append({'path':path,'error':str(e)[:500]})
                        await asyncio.sleep(.3)
        except Exception as e:report['errors'].append({'error':str(e)[:1000]})
        finally:await browser.close()
    (OUT/'betting-cloud-pilot71.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'responses':len(report['responses']),'errors':report['errors']},ensure_ascii=False),flush=True)
asyncio.run(main())
