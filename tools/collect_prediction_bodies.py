"""Public HTML only; exact requested period, no scripts, no TLS bypass."""
import argparse,datetime,hashlib,html,json,re,urllib.request,urllib.parse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCES=[('宝典新澳','xa','https://bdw-1.baddw.com:2028/yjjy/default.html'),('八仙新澳','xa','https://x3gqqfku.fbaxianguohailmn123.com:3106/1489zhuye/'),('韩湘子老澳','la','https://icvhnp93.vhanxiangzipqr234.com:3605/97877zhuyea/'),('吕洞宾老澳','la','https://kat3g3wc.zlvdongbinxyz456.com:3513/zhuyea/'),('鬼谷子待确认','unconfirmed','https://yyzy823.tebjz25.com:7749/ggz/wz/ggz-wz.html')]
def read(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=25) as r:b=r.read(4000000)
 s=min((b.decode(e,'replace') for e in ('utf-8','gb18030')),key=lambda t:t.count('\ufffd'))
 if re.search(r'<title>\s*Security|安全验证|Access Denied',s,re.I):raise ValueError('Access check; not prediction content')
 return s
def plain(s):
 s=re.sub(r'<!--.*?-->','',s,flags=re.S)
 s=re.sub(r'<(script|style)\b.*?</\1>','',s,flags=re.S|re.I)
 s=re.sub(r'<br\s*/?>|</(?:p|div|tr|h[1-6])>','\n',s,flags=re.I)
 return re.sub(r'[ \t]+',' ',html.unescape(re.sub('<[^>]*>','',s)))
def parse(s,url,lot,period):
 result=[];seen=set()
 blocks=list(re.finditer(r'<tr\b.*?</tr>|<li\b.*?</li>',s,re.S|re.I))
 for block in blocks:
  raw=block[0];t=plain(raw).strip();m=re.match(r'(\d{2,4})期\s*[:：]?\s*(.*)',t,re.S)
  if not m or int(m[1])!=period or len(re.findall(r'\d{2,4}期',t))!=1:continue
  heading=[v for v in re.findall(r'【([^】]+)】',plain(s[:block.start()])) if re.search('复式|复试|三中|3中|中特|杀|肖|特|尾|波',v)]
  lines=[v.strip() for v in m[2].splitlines() if v.strip()];title=lines[0];body=' '.join(lines[1:])
  if not re.search(r'复式|复试|三中|3中|中特|杀|肖|特|尾|波',title):
   if not heading:continue
   title=heading[-1]
  if not re.search(r'复式|复试|三中|3中|中特|杀|肖|特|尾|波',title):continue
  if not body:continue
  key=title+'|'+body
  if key in seen:continue
  seen.add(key)
  game='z3' if re.search('三中三|3中3',title) else 'z3in2' if '三中二' in title else 'z2' if '二中二' in title else 'lx' if '连肖' in title else 'pt' if '平特' in title else 'te'
  # Never count period or printed result as predicted numbers.
  prediction=re.split(r'开[:：]|特开|开奖',body)[0].strip()
  nums=list(dict.fromkeys(int(n) for n in re.findall(r'(?<!\d)\d{1,2}(?!\d)',prediction) if 1<=int(n)<=49))
  zs=list(dict.fromkeys(re.findall('[鼠牛虎兔龙蛇马羊猴鸡狗猪]',prediction)))
  result.append({'lot':lot,'period':period,'title':title,'game':game,'action':'exclude' if '杀' in title else 'track','predictionText':prediction,'numbers':nums,'zodiacs':zs,'rawText':t,'rawHtml':raw,'struck':bool(re.search(r'<(?:strike|del|s)\b',raw,re.I)),'colors':list(dict.fromkeys(re.findall(r'color=["\x27]([^"\x27]+)',raw,re.I))),'url':url,'status':'pending' if re.search(r'00',prediction) and not nums and not zs else 'needs_review'})
 return result
def main():
 a=argparse.ArgumentParser();a.add_argument('--period',required=True,type=int);args=a.parse_args();out=[]
 for name,lot,url in SOURCES:
  row={'name':name,'lot':lot,'url':url,'period':args.period,'capturedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'entries':[],'errors':[]}
  try:
   s=read(url);pages={url:s}
   for href,label in re.findall(r'<a\b[^>]*href=["\x27]([^"\x27]+)["\x27][^>]*>(.*?)</a>',s,re.S|re.I):
    u=urllib.parse.urljoin(url,html.unescape(href));label=plain(label)
    if urllib.parse.urlparse(u).netloc!=urllib.parse.urlparse(url).netloc or not re.search(r'\bbbs',u) or not re.search('复式|复试|中|特|肖|杀|尾|波',label) or str(args.period)+'期' not in label:continue
    if u in pages:continue
    try:pages[u]=read(u)
    except Exception as e:row['errors'].append({'url':u,'error':str(e)})
   for u,body in pages.items():row['entries'].extend(parse(body,u,lot,args.period))
   row['pageCount']=len(pages);row['status']='read';row['hash']=hashlib.sha256(json.dumps(row['entries'],ensure_ascii=False,sort_keys=True).encode()).hexdigest()
  except Exception as e:row['status']='failed';row['errors'].append({'url':url,'error':str(e)})
  out.append(row);print(name,row['status'],len(row['entries']),'entries',len(row['errors']),'errors',flush=True)
 dest=ROOT/'prediction-source-cache.json';history=ROOT/'tools/local-collector/data/source-history.jsonl';history.parent.mkdir(parents=True,exist_ok=True)
 old=json.loads(dest.read_text('utf-8')) if dest.exists() else {'sources':[]}
 by={r['url']:r for r in old['sources']}
 for row in out:
  prior=by.get(row['url'])
  if row['status']=='read' and (not prior or prior.get('hash')!=row.get('hash') or prior.get('period')!=row['period']):
   with history.open('a',encoding='utf-8') as f:f.write(json.dumps(row,ensure_ascii=False)+'\n')
  if row['status']=='failed' and prior:row['previousSnapshot']=prior # Clearly stale, never current entries.
 dest.write_text(json.dumps({'sources':out},ensure_ascii=False,indent=2),encoding='utf-8')
if __name__=='__main__':main()
