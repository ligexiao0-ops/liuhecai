import json,socket,ssl,time
from pathlib import Path
from urllib.parse import urlparse
import requests
from playwright.sync_api import sync_playwright
urls=['https://kbqrgzhbxp.19333hi.app:2768/index.html','https://juyhgt28888.28888b.app:8445/ok.html#ai60','https://kat3g3wc.zlvdongbinxyz456.com:3513/am.html','https://8my571ef.rbaxianluntanxyz890.com:9133/am.html','https://bhgbg.00269.shop/index.html','https://bhgbg.00269.shop/index777.html','https://ssxzcc19016.490161gg.app:8450/ok.html#vl']
out=Path('candidate-source-report');out.mkdir(exist_ok=True);report=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch()
 for i,url in enumerate(urls):
  r={'url':url,'capturedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'frames':[]};report.append(r);u=urlparse(url)
  try:
   r['dns']=list(set(x[4][0] for x in socket.getaddrinfo(u.hostname,u.port or 443,type=socket.SOCK_STREAM)))
   with socket.create_connection((u.hostname,u.port or 443),timeout=12):r['tcp']='ok'
   res=requests.get(url,timeout=20);res.encoding=res.apparent_encoding;r['http']=res.status_code
   (out/f'{i}-http.html').write_text(res.text,encoding='utf-8')
  except Exception as e:r['httpError']=str(e)
  page=browser.new_page()
  try:
   page.goto(url,wait_until='domcontentloaded',timeout=45000);page.wait_for_timeout(6000)
   r['title']=page.title();r['finalUrl']=page.url
   for j,f in enumerate(page.frames):
    try:
     text=f.locator('body').inner_text(timeout=2500);body=f.content()
     (out/f'{i}-{j}.txt').write_text(text,encoding='utf-8');(out/f'{i}-{j}.html').write_text(body,encoding='utf-8')
     r['frames'].append({'url':f.url,'textLength':len(text),'file':f'{i}-{j}','preview':text[:700]})
    except Exception as e:r['frames'].append({'url':f.url,'error':str(e)})
  except Exception as e:r['browserError']=str(e)
  finally:page.close()
  (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
 browser.close()
