"""Strict adapters for observed table/rowspan structures. Never infer missing values."""
import re,unicodedata
from bs4 import BeautifulSoup

def norm(s):
 s=unicodedata.normalize('NFKC',s).translate(str.maketrans('龍雞豬馬殺碼綠藍頭數復開','龙鸡猪马杀码绿蓝头数复开'))
 return re.sub(r'\(([一二三四五六七八九十]+|\d+)\)(?=[码肖])',r'\1',s)
def count(s):
 if s.isdigit():return int(s)
 if '十' in s:
  a,b=s.split('十');return (('一二三四五六七八九'.index(a)+1) if a else 1)*10+(('一二三四五六七八九'.index(b)+1) if b else 0)
 return '一二三四五六七八九'.index(s)+1
def parse_structured(html,url,lot,period):
 soup=BeautifulSoup(html,'html.parser')
 for x in soup(['script','style']):x.decompose()
 out=[];seen=set()
 def add(title,body,kind,values,row,game='te',action='track',expected=None):
  values=list(dict.fromkeys(values))
  if not values or expected is not None and len(values)!=expected:return
  key=(title,tuple(values))
  if key in seen:return
  seen.add(key)
  out.append(dict(lot=lot,period=period,title=title,predictionText=body,numbers=values if kind=='号码' else [],zodiacs=values if kind=='生肖' else [],game=game,action=action,status='needs_review',url=url,rawText=norm(row.get_text('',strip=False)),rawHtml=str(row),struck=bool(row.find(['s','strike','del'])),colors=[],structuredClaim=dict(kind=kind,values=values,game=game,action=action,period=period,label=title)))
 for row in soup.find_all('tr'):
  if row.find('tr') or row.find('a'):continue
  text=norm(row.get_text('',strip=False));text=re.sub(r'\s+',' ',text)
  if not re.search(r'(?<!\d)'+str(period)+r'\s*期',text):continue
  # Each repeated period is an independent forecast; decorative edge cells are ignored.
  for m in re.finditer(r'(?<!\d)'+str(period)+r'\s*期\s*[:：]?\s*(.*?)(?=\d{2,4}\s*期|\d{2,4}特码开奖结果|$)',text):
   body=re.split(r'(?:特码开奖结果|特开|开奖|开)\s*[:：]?',m[1])[0].strip()
   z=re.match(r'([一二三四五六七八九十]+|\d+)肖\s*[:：]?\s*[【\[(]?\s*([鼠牛虎兔龙蛇马羊猴鸡狗猪\s]+)',body)
   if z:
    n=count(z[1]);add(str(n)+'肖',z[2],'生肖',re.findall('[鼠牛虎兔龙蛇马羊猴鸡狗猪]',z[2]),row,expected=n)
   # Preserve the number payload after the label, never the count in the label.
   n=re.search(r'(稳杀|杀)?\s*([一二三四五六七八九十]+|\d+)码(?:中特|中平特|中)?[】\])]?\s*[:：]?\s*[【\[(]?\s*([0-9\s.,，、]+)',body)
   if n:
    vals=[int(v) for v in re.findall(r'(?<!\d)\d{1,2}(?!\d)',n[3]) if 1<=int(v)<=49]
    add(('杀' if n[1] else '')+str(count(n[2]))+'码',n[3],'号码',vals,row,action='exclude' if n[1] else 'track',expected=count(n[2]))
  # Nearest containing box heading determines rowspan and generic 复试 semantics.
  box=row.find_parent('div');heading=''
  if box:
   h=box.find(class_='list-title');heading=norm(h.get_text()) if h else ''
  if '单双各10码' in heading:
   nxt=row.find_next_sibling('tr');combined=text+' '+(norm(nxt.get_text()) if nxt and not re.search(r'\d+\s*期',nxt.get_text()) else '')
   for m in re.finditer(r'([单双])\s*[:：]\s*([0-9\s.,，、]+)',combined):
    vals=[int(x) for x in re.findall(r'\d{1,2}',m[2]) if 1<=int(x)<=49]
    if all(v%2==(1 if m[1]=='单' else 0) for v in vals):add(m[1]+'数10码',m[2],'号码',vals,row,expected=10)
  if '连肖' in heading and re.search(r'复[式试]',text):
   z=re.search(r'【([鼠牛虎兔龙蛇马羊猴鸡狗猪\s]+)】',text)
   if z:add('复式连肖',z[1],'生肖',re.findall('[鼠牛虎兔龙蛇马羊猴鸡狗猪]',z[1]),row,game='lx')
 return out
