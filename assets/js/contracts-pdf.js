
let contractPdfFonts=null;
async function contractLoadPdfFonts(pdf){
 if(!contractPdfFonts){
  const paths=['assets/fonts/PTSans-Regular.ttf','assets/fonts/PTSans-Bold.ttf'];
  contractPdfFonts=Promise.all(paths.map(async path=>{
   const response=await fetch(path,{cache:'force-cache'});
   if(!response.ok)throw new Error('Не загружается шрифт документа: '+path);
   const bytes=new Uint8Array(await response.arrayBuffer());
   let output='';
   for(let i=0;i<bytes.length;i+=8192)output+=String.fromCharCode(...bytes.subarray(i,i+8192));
   return btoa(output);
  }));
 }
 const [regular,bold]=await contractPdfFonts;
 pdf.addFileToVFS('PTSans-Regular.ttf',regular);
 pdf.addFont('PTSans-Regular.ttf','PTSans','normal');
 pdf.addFileToVFS('PTSans-Bold.ttf',bold);
 pdf.addFont('PTSans-Bold.ttf','PTSans','bold');
}
async function contractBrandImage(){
 if(document.fonts?.load)await document.fonts.load('900 32px Orbitron','PRO-CHISTKA');
 const canvas=document.createElement('canvas');canvas.width=660;canvas.height=84;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#101010';ctx.font='900 46px Orbitron';
 ctx.textBaseline='top';ctx.fillText('PRO-CHISTKA',0,0);
 return canvas.toDataURL('image/png');
}
function contractPdfBuilder(pdf,brand){
 const margin=12.7,limit=284;
 let y=margin,page=0;
 const useFont=(bold,size)=>{pdf.setFont('PTSans',bold?'bold':'normal');pdf.setFontSize(size);pdf.setTextColor(22,22,22);};
 const newPage=()=>{
  if(page)pdf.addPage('a4','portrait');page++;y=margin;
 };
 function header(){
  pdf.addImage(brand,'PNG',margin,y,86,11);
  useFont(false,12);
  pdf.text('к л и н и н г о в ы е   у с л у г и',margin,y+15);
  pdf.setFont('helvetica','bold');pdf.setFontSize(10);
  pdf.text(['+7 993 635 60 64','info@pro-chistka.pro','pro-chistka.pro'],197.3,y+3,{align:'right',lineHeightFactor:1.25});
  pdf.setDrawColor(40,40,40);pdf.setLineWidth(0.25);
  pdf.line(margin,y+25,197.3,y+25);y+=35;
 }
 function ensure(height){if(y+height>limit)newPage();}
 function text(text,bold=false,size=9,indent=0,space=2.3){
  const cleaned=String(text||'').replace(/\s+/g,' ').trim();if(!cleaned)return;
  useFont(bold,size);
  const width=184.6-indent;
  const lines=pdf.splitTextToSize(cleaned,width);
  const lineHeight=size*0.40+1.2;
  for(const line of lines){ensure(lineHeight);pdf.text(line,margin+indent,y);y+=lineHeight;}
  y+=space;
 }
 function centered(textValue,size=12,bold=true){
  useFont(bold,size);
  const lines=pdf.splitTextToSize(String(textValue),184.6);
  for(const line of lines){ensure(6);pdf.text(line,105,y,{align:'center'});y+=size*0.4+1.7;}
  y+=4;
 }
 function cells(table){
  const tds=Array.from(table.querySelectorAll('td'));
  if(tds.length<2)return;
  const left=tds[0].innerText||tds[0].textContent;
  const right=tds[1].innerText||tds[1].textContent;
  const lines=(str)=>String(str).split(/\n+/).flatMap(part=>pdf.splitTextToSize(part.trim(),82));
  useFont(false,9);
  const la=lines(left),ra=lines(right),h=Math.max(65,(Math.max(la.length,ra.length)+2)*5);
  ensure(h);
  pdf.setDrawColor(90,90,90);pdf.rect(margin,y,184.6,h);pdf.line(105,y,105,y+h);
  let yy=y+7;
  for(const l of la){pdf.text(l,margin+3,yy);yy+=5;}
  yy=y+7;
  for(const l of ra){pdf.text(l,108,yy);yy+=5;}
  y+=h+5;
 }
 return {start(){newPage();header();},text,centered,cells,ensure};
}
async function contractRenderPdf(order,d,actOnly){
 const JsPDF=window.jspdf?.jsPDF;
 if(typeof JsPDF!=='function')throw new Error('PDF-движок не загружен');
 const pdf=new JsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
 await contractLoadPdfFonts(pdf);
 const brand=await contractBrandImage();
 const draw=contractPdfBuilder(pdf,brand);
 const root=document.createElement('div');root.innerHTML=actOnly?contractActHtml(order,d):contractDocumentHtml(order,d);
 const source=root.firstElementChild;
 draw.start();
 for(const node of source.children){
  if(node.classList?.contains('document-brand'))continue;
  const tag=node.tagName;
  if(tag==='H2'){draw.centered(node.innerText||node.textContent,12,true);continue;}
  if(tag==='H3'){draw.ensure(13);draw.text(node.innerText||node.textContent,true,10,0,3);continue;}
  if(tag==='P'){draw.text(node.innerText||node.textContent,false,9,0,2);continue;}
  if(tag==='UL'||tag==='OL'){
   Array.from(node.children).forEach((li,index)=>draw.text((tag==='OL'?`${index+1}. `:'• ')+(li.innerText||li.textContent),false,9,4,1));
   continue;
  }
  if(tag==='TABLE'){draw.cells(node);continue;}
  if(node.classList?.contains('contract-sign-line')){draw.ensure(20);draw.text(node.innerText||node.textContent,false,9,0,4);}
 }
 return pdf.output('blob');
}
