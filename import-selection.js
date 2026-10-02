import {validateCatalog} from './curriculum.js';

// All detected rows are imported together; incomplete rows stay editable.
export function setupImportSelection(preview,status){
 const elements=[...preview.querySelectorAll('.pdf-row')];
 const apply=preview.querySelector('#curriculum-apply');
 const counter=document.createElement('p');counter.setAttribute('role','status');
 preview.prepend(counter);
 const feedback=document.createElement('p');feedback.setAttribute('role','alert');feedback.tabIndex=-1;apply.parentElement.after(feedback);
 const required=['title','module','moduleTitle','ects','term','type'];
 function update(){const missing=elements.filter(el=>required.some(k=>!el.querySelector(`[data-field=${k}]`).value.trim())).length;counter.textContent=`${elements.length} LV werden übernommen.${missing?' Bei '+missing+' LV fehlen noch Angaben.':' Alle Pflichtangaben sind ausgefüllt.'}`;apply.textContent=`${elements.length} LV übernehmen`;apply.disabled=elements.length===0;}
 for(const el of elements){if(required.some(k=>!el.querySelector(`[data-field=${k}]`).value.trim()))el.open=true;el.addEventListener('input',update);el.addEventListener('change',update);}
 update();
 return {
  elements,
  report(error){status.textContent='Nicht gespeichert: '+error.message;feedback.textContent=status.textContent;feedback.focus();},
  read(rows){return elements.flatMap((el,i)=>{
   const field=k=>el.querySelector(`[data-field=${k}]`),value=k=>field(k).value;
   for(const key of required)if(!value(key).trim()){
    el.open=true;field(key).focus();throw Error(`${value('title')||'LV '+(i+1)}: ${ {title:'Titel',module:'Modulkürzel',moduleTitle:'Modultitel',ects:'ECTS',term:'Semester',type:'LV-Typ'}[key]} fehlt. Bitte ergänzen oder einer bestehenden LV zuordnen.`);
   }
   const course={...rows[i].course,title:value('title'),module:value('module'),moduleTitle:value('moduleTitle'),ects:+value('ects'),term:{order:+value('term'),title:value('term')+'. Semester'},type:value('type'),area:value('area'),requires:value('requires').split(';').map(x=>x.trim()).filter(Boolean)};
   try{validateCatalog([course]);}catch(error){el.open=true;throw Error(`${course.title}: ${error.message}`);}
   return [{matchId:value('matchId'),course}];
  });}
 };
}
