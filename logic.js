import {courses} from './catalog.js';
export const areas={steop:'StEOP',computerScience:'Informatik',mathematics:'Mathematik',businessInformatics:'Wirtschaftsinformatik',economics:'Wirtschaftswissenschaften',elective:'Wahlfach',thesis:'Bachelorarbeit'};
export const colors=['#246bc1','#188078','#a96918','#7656ac','#b3445a','#607589','#344a60'];
export const fresh=()=>({version:1,progress:{},electives:[],calendar:null,rule:'studyArea',eventColors:{},links:{}});
export function totals(state){
 const ww=state.electives.filter(e=>e.completed).reduce((n,e)=>n+e.ects,0);
 const finished=courses.filter(c=>c.type!=='elective'&&state.progress[c.id]?.status==='completed');
 const done=finished.reduce((n,c)=>n+c.ects,0)+Math.min(15,ww);
 const graded=[...finished.map(c=>({ects:c.ects,grade:state.progress[c.id]?.grade})),...state.electives.filter(e=>e.completed)].filter(e=>+e.grade>=1&&+e.grade<=5);
 const weight=graded.reduce((n,e)=>n+e.ects,0);
 return {total:courses.reduce((n,c)=>n+c.ects,0),done,ww,average:weight?graded.reduce((n,e)=>n+e.ects*+e.grade,0)/weight:null};
}
export function requirements(key){return courses.filter(c=>key==='StEOP'?c.area==='steop':c.module===key||c.title===key||c.moduleTitle===key);}
export function eligible(course,completed){return course.requires.every(key=>{const matches=requirements(key);return matches.length&&matches.every(c=>completed.has(c.id));});}
export function completedIDs(state){return new Set(courses.filter(c=>state.progress[c.id]?.status==='completed').map(c=>c.id));}
export function combinations(state,count){
 const t=totals(state),target=Math.max(0,t.total-t.done)/Math.max(1,count);
 const available=courses.filter(c=>c.type!=='elective'&&!completedIDs(state).has(c.id)&&eligible(c,completedIDs(state)));
 // Keep up to three distinct subsets for every attainable ECTS sum.
 let sums=new Map([[0,[[]]]]);
 for(const c of available){const next=new Map([...sums].map(([n,sets])=>[n,[...sets]]));for(const [n,sets]of sums){const key=n+c.ects;const bucket=next.get(key)||[];for(const set of sets)if(bucket.length<3)bucket.push([...set,c]);next.set(key,bucket);}sums=next;}
 const choices=[...sums].filter(([n])=>n>0).flatMap(([ects,sets])=>sets.map(items=>({ects,items}))).sort((a,b)=>Math.abs(a.ects-target)-Math.abs(b.ects-target)||b.ects-a.ects).slice(0,3);
 return {target,available,choices};
}
export function validateState(raw){
 if(!raw||raw.version!==1||!raw.progress||typeof raw.progress!=='object'||!Array.isArray(raw.electives))throw Error('Kein gültiges CatchStudy-Backup.');
 const s=fresh();
 for(const c of courses){const p=raw.progress[c.id];if(!p)continue;if(!['planned','inProgress','completed'].includes(p.status))throw Error('Ungültiger Kursstatus.');if(p.grade!==''&&p.grade!=null&&!(+p.grade>=1&&+p.grade<=5))throw Error('Ungültige Note.');s.progress[c.id]={status:p.status,grade:p.grade??'',notes:String(p.notes??''),color:/^#[0-9a-f]{6}$/i.test(p.color)?p.color:null};}
 s.electives=raw.electives.map(e=>{if(!e||typeof e.id!=='string'||typeof e.title!=='string'||!Number.isFinite(e.ects)||e.ects<=0||e.ects>180||(e.grade!==''&&e.grade!=null&&!(+e.grade>=1&&+e.grade<=5)))throw Error('Ungültiger Wahlfacheintrag.');return {id:e.id,title:e.title,ects:e.ects,grade:e.grade??'',completed:!!e.completed};});
 if(new Set(s.electives.map(e=>e.id)).size!==s.electives.length)throw Error('Doppelte Wahlfacheinträge.');
 if(raw.calendar!=null){if(typeof raw.calendar.text!=='string'||typeof raw.calendar.name!=='string')throw Error('Ungültiger Kalender.');s.calendar={text:raw.calendar.text,name:raw.calendar.name};}
 if(['studyArea','term','exam'].includes(raw.rule))s.rule=raw.rule;
 for(const [key,value]of Object.entries(raw.eventColors||{}))if(/^#[0-9a-f]{6}$/i.test(value))Object.defineProperty(s.eventColors,key,{value,enumerable:true,writable:true,configurable:true});
 for(const [key,value]of Object.entries(raw.links||{}))if(courses.some(c=>c.id===value))Object.defineProperty(s.links,key,{value,enumerable:true,writable:true,configurable:true});
 return s;
}
