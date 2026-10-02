export async function readCurriculumPDF(file,onProgress=()=>{}){
 if(file.size>20*1024*1024)throw Error('Bitte eine PDF unter 20 MB wählen.');
 const pdfjs=await import('./pdf.min.mjs');
 pdfjs.GlobalWorkerOptions.workerSrc=new URL('./pdf.worker.min.mjs',import.meta.url).href;
 const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false});
 task.onPassword=()=>{task.destroy();};
 try{const doc=await task.promise;if(doc.numPages>100)throw Error('Maximal 100 Seiten unterstützt.');const pages=[];
  for(let n=1;n<=doc.numPages;n++){onProgress(n,doc.numPages);const p=await doc.getPage(n),content=await p.getTextContent(),lines=[];
   for(const item of content.items){if(!item.str)continue;const y=item.transform[5];let line=lines.find(l=>Math.abs(l.y-y)<2);if(!line){line={y,items:[]};lines.push(line);}line.items.push(item);}
   const rows=lines.sort((a,b)=>b.y-a.y).map(l=>({y:l.y,items:l.items.sort((a,b)=>a.transform[4]-b.transform[4]).map(i=>({text:i.str,x:i.transform[4]}))}));
   pages.push({number:n,lines:rows,text:rows.map(l=>l.items.map(i=>i.text).join(' ')).join('\n')});p.cleanup();
  }
  if(pages.reduce((n,p)=>n+p.text.trim().length,0)<100)throw Error('Keine ausreichende Textebene gefunden. Gescannte PDFs benötigen OCR und werden noch nicht unterstützt.');
  return pages;
 }finally{await task.destroy();}
}
