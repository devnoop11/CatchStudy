import ICAL from './ical.js';
export function parseCalendar(text){
 const root=new ICAL.Component(ICAL.parse(text));if(root.name!=='vcalendar')throw Error('Keine gültige ICS-Datei.');
 for(const component of root.getAllSubcomponents('vtimezone')){const id=component.getFirstPropertyValue('tzid');if(id)ICAL.TimezoneService.register(id,new ICAL.Timezone(component));}
 const components=root.getAllSubcomponents('vevent');if(!components.length)throw Error('Die Datei enthält keine Termine.');
 const exceptions=components.filter(c=>c.hasProperty('recurrence-id'));
 const events=components.filter(c=>!c.hasProperty('recurrence-id')).map(c=>new ICAL.Event(c));
 for(const event of events){if(!event.startDate)throw Error('Ein Termin hat kein Startdatum.');for(const ex of exceptions)if(ex.getFirstPropertyValue('uid')===event.uid)event.relateException(new ICAL.Event(ex));}
 return events;
}
export function monday(date){const d=new Date(date);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d;}
export function weekEvents(events,start){
 const end=new Date(start);end.setDate(end.getDate()+7);const out=[];
 for(const event of events){
  if(event.component.getFirstPropertyValue('status')==='CANCELLED')continue;
  const add=(begin,finish,item)=>{const a=begin.toJSDate(),b=finish.toJSDate();if(a<end&&b>start&&item.component.getFirstPropertyValue('status')!=='CANCELLED')out.push({key:event.uid||event.summary,title:item.summary||'Termin',location:item.location||'',notes:item.description||'',start:a,end:b,allDay:begin.isDate});};
  if(!event.isRecurring()){add(event.startDate,event.endDate,event);continue;}
  const iterator=event.iterator();let occurrence,steps=0;
  while((occurrence=iterator.next())){if(++steps>100000)throw Error('Die Terminserie ist zu umfangreich für die Wochenansicht.');if(occurrence.toJSDate()>=end)break;const detail=event.getOccurrenceDetails(occurrence);add(detail.startDate,detail.endDate,detail.item);}
 }
 return out.sort((a,b)=>a.start-b.start);
}
