"""Read only public text from the user-provided site. Never execute page scripts."""
import concurrent.futures,datetime,html,json,re,urllib.request,urllib.parse
from html.parser import HTMLParser
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE='https://x3gqqfku.fbaxianguohailmn123.com:3106/'
class Text(HTMLParser):
 def __init__(self):super().__init__();self.parts=[];self.skip=0
 def handle_starttag(self,tag,attrs):
  if tag in ('script','style','noscript'):self.skip+=1
  if tag in ('br','li','tr','p','div','h1','h2','h3'):self.parts.append('\n')
 def handle_endtag(self,tag):
  if tag in ('script','style','noscript'):self.skip=max(0,self.skip-1)
  if tag in ('li','tr','p','div','h1','h2','h3'):self.parts.append('\n')
 def handle_data(self,data):
  if not self.skip:self.parts.append(data)
def read(url):
 with urllib.request.urlopen(url,timeout=20) as r:b=r.read(4000000)
 return min((b.decode(e,'replace') for e in ('utf-8','gb18030')),key=lambda s:s.count('\ufffd'))
def plain(s):
 p=Text();p.feed(s);return re.sub(r'\n\s*\n','\n',''.join(p.parts)).strip()
def main():
 inner=urllib.parse.urljoin(SOURCE,'1489zhuye/');s=read(inner);urls=[inner]
 for href,body in re.findall(r'<a\b[^>]*href=["\x27]([^"\x27]+)["\x27][^>]*>(.*?)</a>',s,re.S|re.I):
  u=urllib.parse.urljoin(inner,html.unescape(href))
  if urllib.parse.urlparse(u).netloc==urllib.parse.urlparse(SOURCE).netloc and '/bbs567/' in u and re.search('码|肖|尾|波|五行|头',plain(body)):urls.append(u)
 urls=list(dict.fromkeys(urls))[:45];pages=[];errors=[]
 def page(u):return {'url':u,'text':plain(read(u))}
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  futures={pool.submit(page,u):u for u in urls}
  for f in concurrent.futures.as_completed(futures):
   try:pages.append(f.result())
   except Exception as e:errors.append({'url':futures[f],'error':str(e)})
 if not pages:raise RuntimeError('No source text available; preserve existing snapshot')
 out={'source':SOURCE,'capturedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'pages':sorted(pages,key=lambda p:p['url']),'errors':errors,'notice':'Third-party claims, not verified results. Lottery must be confirmed by user.'}
 (ROOT/'website-text-cache.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8');print('Collected text pages:',len(pages),'failed:',len(errors))
if __name__=='__main__':main()
