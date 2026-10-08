import type {Actor} from './auth.ts';
import {fail} from './http.ts';
import {visibleTask} from './tasks.ts';
import type {TaskDocument} from './documents.ts';
import {assistText} from './ai.ts';
const version='document-v1';
export async function translateDocument(env:Env,actor:Actor,id:string,language:unknown,part?:unknown){
 if(language!=='ja'&&language!=='ko')fail(422,'Invalid language');
 const row=await env.DB.prepare('SELECT * FROM task_documents WHERE id=?').bind(id).first<Omit<TaskDocument,'snapshot'>&{snapshot:string}>();if(!row)fail(404,'문서를 찾을 수 없습니다.');await visibleTask(env,actor,row.task_id);
 const s=JSON.parse(row.snapshot) as TaskDocument['snapshot'];
 const entries:[string,string][]=[];for(const key of ['title','description','requirements','evidence_requirements','location_name','target_address','summary','issues'] as const)if(s[key]?.trim())entries.push([key,s[key]]);
 s.evidence.forEach((e,i)=>{if(e.note.trim())entries.push(['note_'+i,e.note]);});
 const parts:Record<string,string>[]=[];let batch:Record<string,string>={};
 for(const [key,text] of entries){if(Object.keys(batch).length>=60||JSON.stringify({...batch,[key]:text}).length>3000){if(Object.keys(batch).length)parts.push(batch);batch={};}batch[key]=text;}if(Object.keys(batch).length)parts.push(batch);
 if(part===undefined){const saved=await env.DB.prepare('SELECT part,result FROM document_translation_parts WHERE document_id=? AND language=? AND version=? ORDER BY part').bind(id,language,version).all<{part:number;result:string}>();return {total:parts.length,parts:saved.results.map(r=>({part:r.part,values:JSON.parse(r.result)}))};}
 if(!Number.isSafeInteger(part)||Number(part)<0||Number(part)>=parts.length)fail(422,'Invalid translation part');
 const index=Number(part);const cached=await env.DB.prepare('SELECT result FROM document_translation_parts WHERE document_id=? AND language=? AND part=? AND version=?').bind(id,language,index,version).first<{result:string}>();if(cached)return {part:index,values:JSON.parse(cached.result)};
 const lease=crypto.randomUUID(),now=Date.now();
 const lock=await env.DB.prepare('INSERT INTO document_translation_locks VALUES (?,?,?,?,?) ON CONFLICT(document_id,language,part) DO UPDATE SET lease=excluded.lease,expires_at=excluded.expires_at WHERE expires_at<? RETURNING lease').bind(id,language,index,lease,now+90000,now).first();if(!lock)fail(409,'다른 요청에서 번역 중입니다. 잠시 후 다시 요청해 주세요.');
 try{
  const fields=parts[index],text=JSON.stringify(fields),context=row.kind==='REQUEST'?'request':'report';
  let values:Record<string,string>;
  if(text.length>3000&&Object.keys(fields).length===1){const [key,source]=Object.entries(fields)[0];values={[key]:(await assistText(env,actor,{text:source,operation:'translate',language,context})).text};}
  else {values=JSON.parse((await assistText(env,actor,{text,operation:'translate',language,context,format:'field-map'})).text);}
  if(Object.keys(fields).length!==Object.keys(values).length||Object.keys(fields).some(k=>typeof values[k]!=='string'||!values[k].trim()))fail(502,'Invalid translated fields');
  await env.DB.prepare('INSERT INTO document_translation_parts VALUES (?,?,?,?,?,?) ON CONFLICT(document_id,language,part,version) DO NOTHING').bind(id,language,index,version,JSON.stringify(values),new Date().toISOString()).run();
  return {part:index,values};
 }finally{await env.DB.prepare('DELETE FROM document_translation_locks WHERE document_id=? AND language=? AND part=? AND lease=?').bind(id,language,index,lease).run();}
}
