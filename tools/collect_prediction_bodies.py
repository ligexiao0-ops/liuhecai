"""Public HTML only; exact requested period, no scripts, no TLS bypass."""
import unicodedata
import argparse,datetime,hashlib,html,json,re,urllib.request,urllib.parse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCES=[('宝典新澳','xa','https://bdw-1.baddw.com:2028/yjjy/default.html'),('八仙新澳','xa','https://x3gqqfku.fbaxianguohailmn123.com:3106/1489zhuye/'),('韩湘子老澳','la','https://icvhnp93.vhanxiangzipqr234.com:3605/97877zhuyea/'),('吕洞宾老澳','la','https://kat3g3wc.zlvdongbinxyz456.com:3513/zhuyea/'),('鬼谷子澳门资料','la','https://yyzy823.tebjz25.com:7749/ggz/wz/ggz-wz.html')]
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
 result=[];seen=set();kw=r'复式|复试|三中|二中|3中|平码|中特|杀|肖|特|尾|头|波|五行|单双|大小|家禽|野兽'
 normalize=lambda v:unicodedata.normalize('NFKC',v).translate(str.maketrans('龍雞豬馬殺碼綠藍門頭數復','龙鸡猪马杀码绿蓝门头数复'))
 blocks=list(re.finditer(r'<tr\b.*?</tr>|<li\b.*?</li>',s,re.S|re.I))
 for bi,block in enumerate(blocks):
  raw=block[0];original=plain(raw).strip();t=normalize(original);m=re.match(r'(\d{2,4})期\s*[:：]?\s*(.*)',t,re.S)
  if not m or int(m[1])!=period or len(re.findall(r'\d{2,4}期',t))!=1:continue
  lines=[v.strip() for v in m[2].splitlines() if v.strip()]
  if not lines:continue
  # Numeric/animal-only following rows belong to this period until the next label.
  for follow in blocks[bi+1:bi+9]:
   extra=normalize(plain(follow[0])).strip()
   if not extra or re.search(r'\d{2,4}期',extra):break
   if not re.fullmatch(r'[鼠牛虎兔龙蛇马羊猴鸡狗猪0-9\s.,，、:：;；\[\]【】《》()（）+＋/|—_待更新中-]+',extra):break
   lines.append(extra);raw+='\n'+follow[0]
  original=plain(raw).strip()
  first=re.sub(r'^\(([一二三四五六七八九十]+)\)(?=肖)',r'\1',lines[0]);title=first
  bracket=re.search(r'[【\[]([^】\]]+)[】\]]',first)
  if bracket and re.search(kw,bracket[1]):title=bracket[1]
  else:title=re.split(r'[《【\[→:：]|(?:特开|开奖|开)\s*[:：（(]',first)[0].strip()
  if not re.search(kw,title):
   heading=[v for v in re.findall(r'【([^】]+)】',normalize(plain(s[:block.start()]))) if re.search(kw,v)]
   if not heading:continue
   title=heading[-1]
  # Keep forecasts beneath a result heading, but never the printed result itself.
  prediction=' '.join(re.sub(r'(?:特开|开奖|开)\s*[:：]?[^\n]*$','',line).strip() for line in lines).strip()
  if not prediction:continue
  key=title+'|'+prediction
  if key in seen:continue
  seen.add(key)
  game='z3' if re.search('三中三|3中3',title) else 'z3in2' if '三中二' in title else 'z2' if '二中二' in title else 'normal' if '平码' in title else 'lx' if '连肖' in title else 'pt' if '平特' in title else 'te'
  if '码' not in title:
   code_label=re.search(r'(\d+|[一二三四五六七八九十]+)码',prediction)
   if code_label and re.search('肖',title):title+='·'+code_label[0]
  value_text=re.sub(r'(?:\d+|[一二三四五六七八九十]+)\s*[码肖尾头波]','',prediction)
  nums=list(dict.fromkeys(int(n) for n in re.findall(r'(?<!\d)\d{1,2}(?!\d)',value_text) if 1<=int(n)<=49))
  zs=list(dict.fromkeys(re.findall('[鼠牛虎兔龙蛇马羊猴鸡狗猪]',prediction)))
  pending=bool(re.search(r'待.?更新|更新中|更.新.中',prediction)) or bool(re.search(r'00',value_text) and not nums and not zs)
  result.append({'lot':lot,'period':period,'title':title,'game':game,'action':'exclude' if '杀' in title else 'track','predictionText':prediction,'numbers':nums,'zodiacs':zs,'rawText':original,'rawHtml':raw,'struck':bool(re.search(r'<(?:strike|del|s)\b',raw,re.I)),'colors':list(dict.fromkeys(re.findall(r'color=["\x27]([^"\x27]+)',raw,re.I))),'url':url,'status':'pending' if pending else 'needs_review'})
 return result

def main():
 a=argparse.ArgumentParser();g=a.add_mutually_exclusive_group(required=True);g.add_argument('--period',type=int);g.add_argument('--today',action='store_true');args=a.parse_args();out=[]
 if args.today:args.period=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).timetuple().tm_yday
 for name,lot,url in SOURCES:
  row={'name':name,'lot':lot,'url':url,'period':args.period,'capturedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'entries':[],'errors':[]}
  try:
   s=read(url);pages={url:s}
   for href,label in re.findall(r'<a\b[^>]*href=["\x27]([^"\x27]+)["\x27][^>]*>(.*?)</a>',s,re.S|re.I):
    u=urllib.parse.urljoin(url,html.unescape(href));label=plain(label)
    if urllib.parse.urlparse(u).netloc!=urllib.parse.urlparse(url).netloc or not re.search(r'\bbbs',u) or not re.search('复式|复试|中|特|肖|杀|尾|头|波|五行|单双|大小|家禽|野兽',label) or str(args.period)+'期' not in label:continue
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
  if row['status']=='failed' and prior:
   if prior.get('period')==row['period'] and prior.get('entries'):
    row.update(status='stale',entries=prior['entries'],lastAttemptAt=row['capturedAt'],capturedAt=prior['capturedAt'],hash=prior.get('hash'))
   else:row['previousSnapshot']={k:prior.get(k) for k in ('period','capturedAt','status')} # Never apply a different period.
 dest.write_text(json.dumps({'sources':out},ensure_ascii=False,indent=2),encoding='utf-8')
if __name__=='__main__':main()
