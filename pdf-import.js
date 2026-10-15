(function(){'use strict';let lib;
async function* pages(file){
 if(!lib){lib=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');lib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';}
 const task=lib.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false});let doc;
 try{doc=await task.promise;if(doc.numPages>50)throw Error('PDF超过50页，请拆分后上传');for(let i=1;i<=doc.numPages;i++){const page=await doc.getPage(i),content=await page.getTextContent();const text=content.items.map(t=>t.str+(t.hasEOL?'\n':' ')).join('');const base=page.getViewport({scale:1}),view=page.getViewport({scale:Math.min(2,1600/Math.max(base.width,base.height))}),canvas=document.createElement('canvas');canvas.width=Math.ceil(view.width);canvas.height=Math.ceil(view.height);await page.render({canvasContext:canvas.getContext('2d'),viewport:view}).promise;yield {name:file.name+' · 第'+i+'页',data:canvas.toDataURL('image/jpeg',.85),text,status:text.trim()?'✅ PDF文字已提取，请核对':'✅ 扫描PDF已保存，请点击识别此图'};canvas.width=canvas.height=0;page.cleanup();}}
 finally{await task.destroy();}
}
window.PdfImport={pages};})();
