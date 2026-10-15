import socket,ssl,json,time,re,urllib.request
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
URLS=['https://bdw-r8f.mk3lo7g-lamt.app:2028/#tb','https://bdw-1.baddw.com:2028/#888','https://y1q4s2-zd.fe1ps4my-lamb.app:2028/#tb']
root=Path(__file__).resolve().parents[2];out=root/'cloud-probe-output';out.mkdir(exist_ok=True)
report={'version':'cloud-probe-1','environment':'GitHub Actions ubuntu-latest','started':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'sources':[]}
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True)
 for i,url in enumerate(URLS):
  u=urlparse(url);r={'url':url,'host':u.hostname,'port':u.port or 443,'dns':{},'tcp':{},'https':{},'browser':{}};report['sources'].append(r)
  try:r['dns']={'ok':True,'addresses':sorted(set(x[4][0] for x in socket.getaddrinfo(u.hostname,u.port,type=socket.SOCK_STREAM)))}
  except Exception as e:r['dns']={'ok':False,'error':str(e)}
  if r['dns']['ok']:
   try:
    with socket.create_connection((u.hostname,u.port),timeout=12):pass
    r['tcp']={'ok':True}
   except Exception as e:r['tcp']={'ok':False,'error':str(e)}
  if r['tcp'].get('ok'):
   try:
    req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
    with urllib.request.urlopen(req,timeout=20) as res:
     raw=res.read(2000000);r['https']={'ok':True,'status':res.status,'finalUrl':res.url,'bytes':len(raw),'contentType':res.headers.get('Content-Type')}
     (out/f'{i}-response.html').write_bytes(raw)
   except Exception as e:r['https']={'ok':False,'error':str(e)}
  page=browser.new_page();network=[]
  page.on('response',lambda res:network.append({'url':res.url,'status':res.status,'type':res.request.resource_type}) if res.request.resource_type in ['document','xhr','fetch'] else None)
  try:
   page.goto(url,wait_until='domcontentloaded',timeout=30000);page.wait_for_timeout(4000)
   frames=[]
   for j,f in enumerate(page.frames):
    try:
     text=f.locator('body').inner_text(timeout=5000);(out/f'{i}-frame-{j}.txt').write_text(text,encoding='utf-8')
     for name in ['web-text-rules.js','content.js','columns.js']:f.add_script_tag(content=(root/'edge-collector-stage1'/name).read_text(encoding='utf-8'))
     result=f.evaluate('SancaiDOMCollector.read(null)');frames.append({'url':f.url,'length':len(text),'result':result})
    except Exception as e:frames.append({'url':f.url,'error':str(e)})
   r['browser']={'ok':True,'title':page.title(),'finalUrl':page.url,'frames':frames,'network':network}
   page.screenshot(path=str(out/f'{i}-page.png'))
  except Exception as e:r['browser']={'ok':False,'error':str(e),'network':network}
  finally:page.close()
  (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
  print(json.dumps({k:v for k,v in r.items() if k!='browser'},ensure_ascii=False),flush=True)
 browser.close()
