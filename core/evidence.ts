import {fileTypeFromBuffer} from 'file-type';
import {validateMedia} from './media.ts';
import {type Actor,requireRole,sha256} from './auth.ts';
import {auditStatement,visibleTask} from './tasks.ts';
import {ApiError,boundedBody,coordinate,fail,textField} from './http.ts';
type Evidence={id:string;task_id:string;agent_id:string;round:number;filename:string;mime:string;size:number;storage_key:string;sha256:string;latitude:number|null;longitude:number|null;created_at:string;removed_at:string|null};
const allowed:Record<string,string[]>={'image/jpeg':['jpg','jpeg'],'image/png':['png'],'image/webp':['webp'],'video/mp4':['mp4'],'video/webm':['webm']};
export async function uploadEvidence(request:Request,env:Env,actor:Actor,taskId:string){
 requireRole(actor,'AGENT');const task=await visibleTask(env,actor,taskId);if(task.status!=='IN_PROGRESS')fail(409,'업무 진행 중에만 Evidence를 등록할 수 있습니다.');if(!env.FILES)fail(503,'파일 저장소 연결을 기다리고 있습니다.');
 const max=Number(env.UPLOAD_MAX_BYTES);const bytes=await boundedBody(request,max+65536);let form:FormData;
 try{form=await new Response(bytes,{headers:{'content-type':request.headers.get('content-type')||''}}).formData();}catch{fail(422,'파일 업로드 형식이 올바르지 않습니다.');}
 const file=form.get('file');if(!file||typeof file==='string')fail(422,'사진 또는 동영상을 선택해 주세요.');if(!file.size||file.size>max)fail(413,'빈 파일 또는 허용 크기를 초과한 파일입니다.');
 const filename=textField(file.name,'파일명',240);if(/[\\/\x00-\x1f]/.test(filename)||filename.includes('..'))fail(422,'파일명이 올바르지 않습니다.');
 const data=await file.arrayBuffer();let detected;
 try{detected=await fileTypeFromBuffer(data);}catch{fail(415,'파일을 인식할 수 없습니다.');}
 const extension=filename.split('.').at(-1)?.toLowerCase()||'';
 if(!detected||!allowed[detected.mime]?.includes(extension)||(file.type&&file.type!==detected.mime))fail(415,'JPG, PNG, WEBP, MP4, WEBM 원본 파일만 등록할 수 있습니다.');
 validateMedia(data,detected.mime);
 const lat=form.get('latitude'),lng=form.get('longitude');let latitude:number|null=null,longitude:number|null=null;
 if(lat||lng){if(!lat||!lng)fail(422,'위도와 경도를 함께 입력해 주세요.');latitude=coordinate(Number(lat),90);longitude=coordinate(Number(lng),180);}
 const accuracy=form.get('accuracy')?Number(form.get('accuracy')):null;if(accuracy!==null&&(!Number.isFinite(accuracy)||accuracy<0))fail(422,'GPS 정확도를 확인해 주세요.');
 const captured=form.get('captured_at')?String(form.get('captured_at')):null;if(captured&&(!Number.isFinite(Date.parse(captured))||captured.length>40))fail(422,'촬영 시각을 확인해 주세요.');
 const locationTime=form.get('location_recorded_at')?String(form.get('location_recorded_at')):null;if(locationTime&&(!Number.isFinite(Date.parse(locationTime))||locationTime.length>40))fail(422,'위치 수집 시각을 확인해 주세요.');
 const note=textField(String(form.get('note')||''),'현장 메모',4000,false);
 const id='EV-'+crypto.randomUUID(),event=crypto.randomUUID(),now=new Date().toISOString(),hash=await sha256(data),key=`tasks/${taskId}/evidence/${id}/original.${detected.ext}`;
 await env.FILES.put(key,data,{httpMetadata:{contentType:detected.mime},sha256:hash});
 try{
  const result=await env.DB.batch([
   env.DB.prepare("UPDATE tasks SET version=version+1,mutation_id=?,updated_at=? WHERE id=? AND version=? AND status='IN_PROGRESS'").bind(event,now,taskId,task.version),
   env.DB.prepare('INSERT INTO evidence(id,task_id,agent_id,round,filename,mime,size,storage_key,sha256,latitude,longitude,accuracy,captured_at,created_at,note,location_recorded_at) SELECT ?,id,?,?,?,?,?,?,?,?,?,?,?,?,?,? FROM tasks WHERE id=? AND mutation_id=?').bind(id,actor.id,task.round,filename,detected.mime,file.size,key,hash,latitude,longitude,accuracy,captured,now,note,locationTime,taskId,event),
   auditStatement(env,actor,taskId,event,'EVIDENCE_UPLOADED',{evidence_id:id,round:task.round,sha256:hash},now)
  ]);if(result[0].meta.changes!==1)fail(409,'업무 상태가 변경되었습니다. 새로고침 후 다시 시도해 주세요.');
 }catch(error){
  // Preserve the original if a write may have committed before a transport error.
  // If reconciliation itself fails, retain the object for later inspection.
  let committed:unknown;try{committed=await env.DB.prepare('SELECT id FROM evidence WHERE id=?').bind(id).first();}catch{throw error;}
  if(!committed)await env.FILES.delete(key);throw error;
 }
 return {id,task_id:taskId,agent_id:actor.id,round:task.round,filename,mime:detected.mime,size:file.size,sha256:hash,latitude,longitude,note,created_at:now};
}
export async function evidenceContent(request:Request,env:Env,actor:Actor,id:string){
 const evidence=await env.DB.prepare('SELECT * FROM evidence WHERE id=?').bind(id).first<Evidence>();if(!evidence)fail(404,'Evidence를 찾을 수 없습니다.');await visibleTask(env,actor,evidence.task_id);
 const headers:Record<string,string>={'content-type':evidence.mime,'cache-control':'private, no-store','x-content-type-options':'nosniff','accept-ranges':'bytes','content-disposition':`inline; filename*=UTF-8''${encodeURIComponent(evidence.filename)}`};
 let range:{offset:number;length:number}|undefined;const requested=request.headers.get('range');
 if(requested){const m=requested.match(/^bytes=(\d*)-(\d*)$/);if(!m||(!m[1]&&!m[2]))return new Response(null,{status:416,headers:{...headers,'content-range':`bytes */${evidence.size}`}});const start=m[1]?Number(m[1]):Math.max(0,evidence.size-Number(m[2]));const end=m[1]?(m[2]?Math.min(Number(m[2]),evidence.size-1):evidence.size-1):evidence.size-1;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=evidence.size)return new Response(null,{status:416,headers:{...headers,'content-range':`bytes */${evidence.size}`}});range={offset:start,length:end-start+1};headers['content-range']=`bytes ${start}-${end}/${evidence.size}`;}
 const object=await env.FILES.get(evidence.storage_key,range?{range}:{});if(!object)fail(404,'원본 파일을 찾을 수 없습니다.');headers['content-length']=String(range?.length||evidence.size);return new Response(request.method==='HEAD'?null:object.body,{status:range?206:200,headers});
}
export async function removeEvidence(env:Env,actor:Actor,id:string,reasonValue:unknown){requireRole(actor,'AGENT');const evidence=await env.DB.prepare('SELECT * FROM evidence WHERE id=?').bind(id).first<Evidence>();if(!evidence)fail(404,'Evidence를 찾을 수 없습니다.');const task=await visibleTask(env,actor,evidence.task_id);if(task.status!=='IN_PROGRESS'||task.round!==evidence.round||evidence.removed_at)fail(409,'현재 회차의 진행 중 Evidence만 제외할 수 있습니다.');const reason=textField(reasonValue,'제외 사유');const event=crypto.randomUUID(),now=new Date().toISOString();const r=await env.DB.batch([env.DB.prepare("UPDATE tasks SET version=version+1,mutation_id=?,updated_at=? WHERE id=? AND version=? AND status='IN_PROGRESS'").bind(event,now,task.id,task.version),env.DB.prepare('UPDATE evidence SET removed_at=? WHERE id=? AND EXISTS(SELECT 1 FROM tasks WHERE id=? AND mutation_id=?)').bind(now,id,task.id,event),auditStatement(env,actor,task.id,event,'EVIDENCE_REMOVED',{evidence_id:id,reason},now)]);if(r[0].meta.changes!==1)throw new ApiError(409,'업무 상태가 변경되었습니다.');return {ok:true};}
