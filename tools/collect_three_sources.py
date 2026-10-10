"""Collect the three user-selected public sources; report unavailable data explicitly."""
import concurrent.futures,datetime,json,re,urllib.parse
from pathlib import Path
from collect_website_text import plain,read
ROOT=Path(__file__).resolve().parents[1]
URLS=['https://zzyymm49347.490151gg.app:8450/ok.html','https://nttlbzlsfq.18149fj.app:3082/18149.html','https://yyaaff018899.49018899gg.app:8450/ok.html']
def collect(item):
 i,url=item;origin=url;result={'source':chr(65+i),'url':url,'entries':[]}
 try:
  for depth in range(7):
   s=read(url)
   if re.search('<title>Security</title>',s,re.I):raise RuntimeError('安全校验页，未取得资料正文')
   m=re.search(r"null,'([0-9A-Za-z]+)'",s)
   if m:
    decoded=''.join(chr(int(n)) for n in re.split('[A-Za-z]+',m.group(1)) if n)
    f=re.search(r'<iframe[^>]*src=["\x27]([^"\x27]+)',decoded)
    if f:url=urllib.parse.urljoin(url,f[1]).split('#')[0];continue
   f=re.search(r'<iframe[^>]*src=["\x27]([^"\x27]+)',s)
   if f and (f[1].startswith(('https://','http://','/'))):url=urllib.parse.urljoin(url,f[1]).split('#')[0];continue
   if '/js/home.js' in s:
    script=read(urllib.parse.urljoin(url,'/js/home.js'));f=re.search(r"var url\s*=\s*'([^']+)'",script)
    if f:url=urllib.parse.urljoin(url,f[1]);continue
   break
  t=plain(s);result['text']=t;result['resolvedUrl']=url
  if '新澳门精品站点' in t:lot='xa'
  else:lot=None
  # Numeric-only continuation lines, never include printed draw results or period digits.
  for m in re.finditer(r'(\d{1,3})期[^\n]*?(?:特围|精选|围特)?(\d{1,2})码[^\n]*\n((?:[ \t]*[\d.,，、]+[ \t]*\r?\n)+)',t):
   ns=sorted(set(int(n) for n in re.findall(r'\d+',m[3]) if 1<=int(n)<=49))
   if ns and len(ns)==int(m[2]) and lot:result['entries'].append({'lot':lot,'period':int(m[1]),'game':'te','label':m[2]+'码范围','pool':ns,'source':result['source'],'url':origin,'retrospective':True})
  result['status']='已读文字；提取'+str(len(result['entries']))+'组明确彩种号码。三中三／复式／连肖须正文明确标注；未出现不推断。' if lot else '已读文字，彩种未明确，不能自动交集'
 except Exception as e:result['status']=str(e)
 return result
def main():
 with concurrent.futures.ThreadPoolExecutor(3) as p:sources=list(p.map(collect,enumerate(URLS)))
 out={'capturedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sources':sources}
 (ROOT/'three-source-cache.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
 print('Source entry counts:',[(s['source'],len(s['entries'])) for s in sources])
if __name__=='__main__':main()
