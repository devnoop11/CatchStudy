import {courses as original} from './catalog.js';
import {parseSemesterPlan} from './semester-parser.js';
export const courses=structuredClone(original);
export function activateCatalog(state){courses.splice(0,courses.length,...structuredClone(state.curriculum?.courses||original));}
export function validateCatalog(value){
 if(!Array.isArray(value)||!value.length||value.length>200)throw Error('Der Studienplan muss 1 bis 200 LV enthalten.');
 const ids=new Set();
 return value.map(c=>{
  if(!c||!/^[-a-zA-Z0-9_]+$/.test(c.id)||['__proto__','constructor','prototype'].includes(c.id)||ids.has(c.id))throw Error('Ungültige oder doppelte LV-ID.');ids.add(c.id);
  if(!['unknown','vo','vu','ue','uk','lp','elective','se','ps'].includes(c.type)||!['unknown','steop','computerScience','mathematics','businessInformatics','economics','elective','thesis'].includes(c.area))throw Error('Lehrform oder Modulgruppe prüfen.');
  if(!Number.isFinite(c.ects)||c.ects<0||c.ects>180||!Number.isInteger(c.term?.order)||c.term.order<1||c.term.order>99)throw Error('ECTS oder Semester prüfen.');
  for(const key of ['title','module','moduleTitle'])if(typeof c[key]!=='string'||!c[key].trim()||c[key].length>500)throw Error('Titel und Modul müssen ausgefüllt sein.');
  for(const key of ['requires','recommends'])if(!Array.isArray(c[key])||c[key].length>50||c[key].some(r=>typeof r!=='string'||r.length>500))throw Error('Voraussetzungen prüfen.');
  const missing=['type','ects','term','module','moduleTitle','area','requires'].filter(k=>({type:c.type==='unknown',ects:c.ects===0,term:c.term.order===99,module:c.module==='Nicht zugeordnet',moduleTitle:c.moduleTitle==='Nicht zugeordnet',area:c.area==='unknown',requires:c.requires.includes('UNGEPRUEFT')})[k]);
  return {id:c.id,title:c.title.trim(),module:c.module.trim(),moduleTitle:c.moduleTitle.trim(),type:c.type,area:c.area,ects:c.ects,term:{order:c.term.order,title:c.term.order===99?'Semester noch offen':/^[\d.\s–-]+Semester$/.test(c.term.title)?c.term.title:c.term.order+'. Semester'},requires:[...c.requires],recommends:[...c.recommends],order:Number(c.order)||0,missing};
 });
}
export function replaceCurriculum(state,rows,name){
 if(!rows.length)throw Error('Keine LV erkannt. Der bisherige Studienplan bleibt unverändert.');
 const next=structuredClone(state),previous=structuredClone(state);delete previous.beforeCurriculum;
 const used=new Set();
 const plan=rows.map((row,i)=>{const c=row.course;const id=row.matchId||'import-'+crypto.randomUUID();if(used.has(id))throw Error('Doppelte LV-Zuordnung.');used.add(id);
  // Only extracted information belongs to the new curriculum, not old rules or semesters.
  return row.extracted?{...structuredClone(c),id,order:i}:{id,title:c.title,type:c.type||'unknown',ects:Number.isFinite(c.ects)?c.ects:0,module:'Nicht zugeordnet',moduleTitle:'Nicht zugeordnet',area:'unknown',term:{order:99,title:'Semester noch offen'},requires:['UNGEPRUEFT'],recommends:[],order:i};
 });
 next.curriculum={name:String(name).slice(0,200),courses:validateCatalog(plan)};
 next.progress=Object.fromEntries(Object.entries(next.progress).filter(([id])=>used.has(id)));
 next.links=Object.fromEntries(Object.entries(next.links).filter(([,id])=>used.has(id)));
 next.electives=[];next.beforeCurriculum=previous;
 return next;
}
const normalize=s=>s.toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export function proposeCourses(pages,current=courses){
 const table=parseSemesterPlan(pages,current);if(table.length)return table;
 const found=new Map();
 for(const page of pages){
  const text=page.text.replace(/(\p{L})-\s*\n\s*(\p{Ll})/gu,'$1$2');
  // Only explicit LV type + title + ECTS rows, never module totals or prose rules.
  const re=/\b(VO|VU|UE|UK|LP|SE|PS)\s+([^\n]{3,180}?),?\s+(\d+(?:[.,]\d+)?)\s*ECTS\b/g;
  for(const match of text.matchAll(re)){
   const title=match[2].replace(/,\s*$/,'').trim(),type=match[1].toLowerCase(),ects=Number(match[3].replace(',','.'));
   if(ects<=0||ects>180)continue;
   const key=type+normalize(title),existing=current.filter(c=>c.type===type&&normalize(c.title.replace(/^(VO|VU|UE|UK|LP)\s+/i,''))===normalize(title));
   if(found.has(key)){const prior=found.get(key);if(prior.course.ects!==ects)prior.warning='Widersprüchliche ECTS-Angaben: bitte Original prüfen.';continue;}
   const old=existing.length===1?existing[0]:null;
   found.set(key,{course:old?{...structuredClone(old),ects}:{id:'pdf-'+found.size,title,type,ects,module:'',moduleTitle:'',term:{order:1,title:'1. Semester'},area:'businessInformatics',requires:['UNGEPRUEFT'],recommends:[],order:current.length+found.size},matchId:old?.id||'',page:page.number,source:match[0],warning:old?'Zuordnung anhand von Titel und Lehrform. Semester und Regeln bleiben unverändert.':'Neue LV: Modul, Semester und Voraussetzungen sind nicht erkannt. Bitte ergänzen.'});
  }
 }
 return [...found.values()];
}
export function mergeCurriculum(state,rows,name){
 const next=structuredClone(state),base=structuredClone(state.curriculum?.courses||original),used=new Set();
 for(const row of rows){const c=structuredClone(row.course);if(row.matchId){if(used.has(row.matchId))throw Error('Eine bestehende LV wurde mehrfach zugeordnet.');used.add(row.matchId);const i=base.findIndex(x=>x.id===row.matchId);if(i<0)throw Error('Zuordnung nicht gefunden.');c.id=row.matchId;base[i]=c;}else{c.id='import-'+crypto.randomUUID();base.push(c);}}
 next.curriculum={name:String(name).slice(0,200),courses:validateCatalog(base)};
 return next;
}
