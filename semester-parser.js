const norm=s=>s.toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const join=(a,b)=>a.endsWith('-')?a.slice(0,-1)+b:a+' '+b;
const areaFor=s=>/steop|orientierungsphase/i.test(s)?'steop':/mathematik/i.test(s)?'mathematics':/wirtschaftsinformatik/i.test(s)?'businessInformatics':/wirtschaftswissenschaft/i.test(s)?'economics':/wahlfach/i.test(s)?'elective':/bachelorarbeit/i.test(s)?'thesis':/informatik/i.test(s)?'computerScience':'unknown';
export function parseSemesterPlan(pages,current=[]){
 let active=false,bounds=null,semester=99,termTitle='Semester noch offen',module='',steop=false,pending=null;
 const rows=[];
 for(const page of pages){
  for(const line of page.lines||[]){
   const text=line.items.map(i=>i.text).join(' ').trim();
   if(/Empfohlener Pfad durch das Studium/i.test(text)){active=true;continue;}
   if(!active)continue;
   if(/Englische (Titel|Modultitel)|^§/.test(text)){active=false;break;}
   if(/Semester.*Modul.*Lehrveranstaltung/.test(text)){
    const pos=word=>line.items.find(i=>i.text.trim()===word)?.x;
    const m=pos('Modul'),lv=pos('Lehrveranstaltung'),e=pos('ECTS'),sum=pos('Summe');
    if([m,lv,e,sum].every(Number.isFinite))bounds={m:m-4,lv:lv-4,e:e-4,sum:sum-4};continue;
   }
   if(!bounds||/^(Curriculum|Rechtsverbindlich|Seite\s+\d)/.test(text))continue;
   const cell=(lo,hi)=>line.items.filter(i=>i.x>=lo&&i.x<hi).map(i=>i.text).join(' ').trim();
   const sem=cell(-Infinity,bounds.m),mod=cell(bounds.m,bounds.lv),title=cell(bounds.lv,bounds.e),credit=cell(bounds.e,bounds.sum);
   if(/^\d{1,2}\./.test(sem)){semester=Number(sem.match(/^\d+/)[0]);termTitle=sem.replace(/\s/g,'')+' Semester';}
   if(/^(?:StEOP\s+)?[A-Z][A-Z0-9]*$/i.test(mod)&&mod!=='ECTS'){module=mod.replace(/^StEOP\s+/i,'');steop=/StEOP/i.test(mod);}
   const type=title.match(/^(VO|VU|UE|UK|LP|SE|PS)\s+(.+)/);
   const elective=/^(Lehrveranstaltungen nach Wahl|Gewählte Lehrveranstaltungen)/i.test(title);
   if(type||elective){
    pending={course:{id:'table-'+rows.length,title:type?type[1]+' '+type[2]:title,type:type?type[1].toLowerCase():'elective',ects:/^\d+(?:[.,]\d+)?$/.test(credit)?Number(credit.replace(',','.')):0,module:module||'Nicht zugeordnet',moduleTitle:'Nicht zugeordnet',area:steop?'steop':elective?'elective':'unknown',term:{order:semester,title:termTitle},requires:['UNGEPRUEFT'],recommends:[],order:rows.length},page:page.number,source:text,extracted:true};rows.push(pending);
   }else if(pending&&title&&!/^(ECTS|Summe)$/.test(title)){
    pending.course.title=join(pending.course.title,title);pending.source+=' '+text;
    if(!pending.course.ects&&/^\d+(?:[.,]\d+)?$/.test(credit))pending.course.ects=Number(credit.replace(',','.'));
   }
   if(pending&&!pending.course.ects&&/^\d+(?:[.,]\d+)?$/.test(credit))pending.course.ects=Number(credit.replace(',','.'));
  }
 }
 if(!rows.length)return[];
 const codes=new Set(rows.map(r=>r.course.module));
 const descriptions=readModules(pages,codes);
 for(const row of rows){const c=row.course,d=descriptions.get(c.module);if(d){c.moduleTitle=d.title;c.requires=[...d.requires];if(c.area==='unknown')c.area=d.area;}
  const matches=current.filter(old=>old.type===c.type&&norm(old.title)===norm(c.title));row.matchId=matches.length===1?matches[0].id:'';
  // Course-specific prose is not safely represented as module prerequisites.
  if(d?.text.includes('Voraussetzung für die Teilnahme')){
   const rules=[...d.text.matchAll(/positive Absolvierung der (.+?) ist Voraussetzung für die Teilnahme am (.+?)\./g)];
   if(!rules.length)c.requires=[...new Set([...c.requires,'UNGEPRUEFT'])];
   for(const rule of rules)if(norm(rule[2])===norm(c.title)){
    const prerequisite=rows.find(r=>norm(r.course.title)===norm(rule[1]));
    c.requires.push(prerequisite?prerequisite.course.title:'UNGEPRUEFT');
   }
  }
  row.warning=c.requires.includes('UNGEPRUEFT')?'Voraussetzungen noch ergänzen.':'Aus Semesterplan und Modulbeschreibung gelesen.';
 }
 return rows;
}
export function readModules(pages,codes){
 const result=new Map();let area='unknown',block=null;
 function finish(){if(!block)return;const text=block.lines.join(' ').replace(/\s+/g,' ');const header=text.split(/Teilnahmevoraus/)[0];const title=header.replace(/^\S+\s+/,'').replace(/ECTS\s*[- ]\s*Punkte/gi,'').replace(/(\p{L})-\s+(\p{Ll})/gu,'$1$2').replace(/\([^)]*\)/g,'').replace(/\s+\d+(?:[.,]\d+)?\s*$/,'').trim();
  const m=text.match(/Teilnahmevoraus\s*-?\s*(?:setzung)?\s+(.+?)(?=Modulziele|Empfohlene|Modulstruktur)/i);let req=['UNGEPRUEFT'];
  if(m){const raw=m[1].replace(/\bsetzung\b/g,'').trim();if(/^Keine\.?$/i.test(raw))req=[];else{const tokens=raw.split(/[,;]\s*|\s+und\s+/).map(s=>s.trim());if(tokens.every(t=>/^StEOP$/i.test(t)||codes.has(t)))req=tokens.map(t=>/^steop$/i.test(t)?'StEOP':t);}}
  result.set(block.code,{title:title||'Nicht zugeordnet',requires:req,area:block.area,text});block=null;
 }
 for(const page of pages){const lines=page.text.split('\n');for(let i=0;i<lines.length;i++){const line=lines[i].trim();if(/Empfohlener Pfad/.test(line)){finish();return result;}if(/^(Curriculum|Rechtsverbindlich|Seite\s+\d)/.test(line))continue;
   if(/^Pflichtmodulgruppe/.test(line)){finish();area=areaFor(line);continue;}
   const code=line.match(/^([A-Z][A-Z0-9]*)\s+/)?.[1];
   if(codes.has(code)&&/ECTS\s*[- ]\s*Punkte/.test(lines.slice(i,i+4).join(' '))){finish();block={code,area:code==='BA'?'thesis':area,lines:[]};}
   if(block)block.lines.push(line);
  }}finish();return result;
}
