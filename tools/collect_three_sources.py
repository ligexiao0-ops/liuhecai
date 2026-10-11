"""Collect the three user-selected public sources; report unavailable data explicitly."""
import concurrent.futures,datetime,json,re,urllib.parse,unicodedata
from pathlib import Path
from collect_website_text import plain,read
ROOT=Path(__file__).resolve().parents[1]
URLS=['https://zzyymm49347.490151gg.app:8450/ok.html','https://gggds8f2sdjss1s48hld0us5k9d5k.ai49gg65gshd5k6s7k8xha9.kediups.com/html/index.html','https://yfc3vz6y.blancaihemnt892.com:5133/','https://juyhgt28888.28888b.app:8445/ok.html']
def collect(item):
 i,url=item;origin=url;url='https://gggds8f2sdjss1s48hld0us5k9d5k.ai49gg65gshd5k6s7k8xha9.kediups.com/html/index.html' if i==1 else urllib.parse.urljoin(url,'99011zhuye/') if i==2 else url;result={'source':chr(65+i),'url':origin,'entries':[], 'aliases':['https://nttlbzlsfq.18149fj.app:3082/18149.html'] if i==1 else []}
 try:
  for depth in range(7):
   s=read(url)
   if re.search('<title>Security</title>',s,re.I):raise RuntimeError('安全校验页，未取得资料正文')
   if i==2 and '平特一肖' in plain(s) and '码中特' in plain(s):break
   if '新澳门精品站点' in plain(s) and re.search(r'特围.{0,8}码',plain(s)):break
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
  t=unicodedata.normalize('NFKC',plain(s));result['text']=t;result['resolvedUrl']=url
  if '新澳门精品站点' in t:lot='xa'
  elif i==2 and urllib.parse.urlparse(origin).hostname=='yfc3vz6y.blancaihemnt892.com':lot='xa' # Root navigation explicitly labels current new-Macau material.
  else:lot=None
  # Numeric-only continuation lines, never include printed draw results or period digits.
  for m in re.finditer(r'(\d{1,3})期[^\n]*?(?:特围|精选|围特)?(\d{1,2})码[^\n]*\n((?:[ \t]*[()\[\]【】\d.,，、]+[ \t]*\r?\n)+)',t):
   ns=sorted(set(int(n) for n in re.findall(r'\d+',m[3]) if 1<=int(n)<=49))
   if ns and len(ns)==int(m[2]) and lot:result['entries'].append({'lot':lot,'period':int(m[1]),'game':'te','label':m[2]+'码范围','pool':ns,'source':result['source'],'url':origin,'retrospective':True})
  if i==2 and lot:
   for m in re.finditer(r'(\d{1,3})期[:：]\s*平特一肖[^\n]*?[〔【]([鼠牛虎兔龙蛇马羊猴鸡狗猪〔【]+)[〕】]',t):
    zs=list(dict.fromkeys(re.findall('[鼠牛虎兔龙蛇马羊猴鸡狗猪]',m[2])))
    if len(zs)==1:result['entries'].append({'lot':lot,'period':int(m[1]),'game':'pt','label':'蓝采和平特一肖','pool':zs,'source':result['source'],'url':origin,'retrospective':True})
  result['status']='已读文字；提取'+str(len(result['entries']))+'组明确彩种号码。三中三／复式／连肖须正文明确标注；未出现不推断。' if lot else '已读文字，彩种未明确，不能自动交集'
 except Exception as e:result['status']=str(e)
 return result
def main():
 with concurrent.futures.ThreadPoolExecutor(3) as p:sources=list(p.map(collect,enumerate(URLS)))
 captured=datetime.datetime.now(datetime.timezone.utc).isoformat()
 path=ROOT/'three-source-cache.json'
 try:previous=json.loads(path.read_text(encoding='utf-8'))
 except (OSError,ValueError):previous={'sources':[]}
 by={s['source']:s for s in previous['sources']}
 for i,s in enumerate(sources):
  old=by.get(s['source'],{})
  if not s.get('entries') and old.get('entries'):
   sources[i]={**old,'capturedAt':old.get('capturedAt',previous.get('capturedAt')),'lastAttemptAt':captured,'lastAttemptStatus':s['status']}
  else:s['capturedAt']=captured
 out={'capturedAt':captured,'sources':sources}
 (ROOT/'three-source-cache.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
 print('Source entry counts:',[(s['source'],len(s['entries'])) for s in sources])
if __name__=='__main__':main()
