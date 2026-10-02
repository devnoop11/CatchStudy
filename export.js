import {courses} from './curriculum.js?v=7';
import {totals,electiveTarget} from './logic.js?v=7';
export function exportPNG(state){
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
 const lines=[];const t=totals(state);
 const rows=[`CatchStudy · ${new Date().toLocaleDateString('de-AT')}`,`${t.done} / ${t.total} ECTS abgeschlossen`, `Notenschnitt: ${t.average?t.average.toFixed(2):'–'}`, '',...courses.map(c=>{const p=state.progress[c.id]||{};return `${c.title} · ${c.ects} ECTS · ${c.type==='elective'?Math.min(t.ww,electiveTarget())+' ECTS erledigt':p.status==='completed'?'Erledigt':p.status==='inProgress'?'Laufend':'Offen'}${p.grade?' · Note '+p.grade:''}`;}),'',...state.electives.map(e=>`${e.title} · ${e.ects} ECTS · ${e.completed?'Erledigt':'Offen'}${e.grade?' · Note '+e.grade:''}`)];
 ctx.font='20px sans-serif';
 for(const row of rows){let line='';for(const word of row.split(' ')){if(ctx.measureText(line+' '+word).width>860&&line){lines.push(line);line=word;}else line+=(line?' ':'')+word;}lines.push(line);}
 canvas.width=1000;canvas.height=100+lines.length*34;
 ctx.fillStyle='#f5f8fb';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#20334b';ctx.font='20px sans-serif';lines.forEach((line,i)=>ctx.fillText(line,50,60+i*34));
 canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='CatchStudy-Studienuebersicht.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
}
