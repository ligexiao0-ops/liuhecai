import json,requests,re
from pathlib import Path
from bs4 import BeautifulSoup
import grok_method
out=Path('cloud-probe-output');out.mkdir(exist_ok=True)
report=[]
for i,url in enumerate(['https://qwea2a.88869.shop/xg.htm','https://qwea2a.88869.shop/xgbbs/762.htm']):
 item={'url':url}
 try:
  response=requests.get(url,headers={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'},timeout=20)
  response.encoding=response.apparent_encoding
  item.update(status=response.status_code,final_url=response.url,encoding=response.encoding,bytes=len(response.content))
  (out/f'{i}-response.html').write_text(response.text,encoding='utf-8')
  # Run the supplied parser against this exact response, without a second request.
  get=grok_method.requests.get;grok_method.requests.get=lambda *a,**kw:response
  try:data=grok_method.extract_page(url)
  finally:grok_method.requests.get=get
  (out/f'{i}-extracted.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
  soup=BeautifulSoup(response.text,'html.parser');item.update(title=data.get('title'),text_length=len(data.get('raw_text','')),table_count=len(data.get('main_texts',[])),number_strings=data.get('numbers',[])[:25],iframe_sources=[x.get('src') for x in soup.find_all('iframe')],periods=re.findall(r'(\d{1,4})\s*期',data.get('raw_text',''))[:25],error=data.get('error'),preview=data.get('raw_text','')[:600])
 except Exception as e:item['error']=str(e)
 report.append(item)
(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))
