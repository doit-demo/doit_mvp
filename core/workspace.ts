import {type Actor,requireRole} from './auth.ts';
import {fail,textField} from './http.ts';
import {visibleTask} from './tasks.ts';
export async function draft(env:Env,actor:Actor,key:string,body?:Record<string,unknown>){
 if(key==='request')requireRole(actor,'CLIENT');
 else {
  requireRole(actor,'AGENT');
  const match=key.match(/^report:(DOIT-[a-f0-9-]+):(\d+)$/);if(!match)fail(422,'Invalid draft');
  const task=await visibleTask(env,actor,match[1]);
  if(task.status!=='IN_PROGRESS'||task.round!==Number(match[2]))fail(409,'현재 상태에서는 보고서를 작성할 수 없습니다.');
 }
 if(body===undefined){const row=await env.DB.prepare('SELECT content,revision,updated_at FROM drafts WHERE user_id=? AND draft_key=?').bind(actor.id,key).first<{content:string;revision:number;updated_at:string}>();return row?{...row,content:JSON.parse(row.content)}:{content:null,revision:0,updated_at:null};}
 if(!Number.isSafeInteger(body.revision)||Number(body.revision)<0)fail(422,'Invalid draft revision');
 const input=body.content;if(!input||typeof input!=='object'||Array.isArray(input))fail(422,'Invalid draft content');
 const allowed=key==='request'?['title','description','location_name','target_address','target_lat','target_lng','requirements','evidence_requirements','country']:['summary','issues'];
 const content:Record<string,string>={};for(const field of allowed)content[field]=textField((input as Record<string,unknown>)[field]??'',field,field==='title'?160:field==='target_address'?500:4000,false);
 const now=new Date().toISOString();
 const saved=await env.DB.prepare(`INSERT INTO drafts(user_id,draft_key,content,revision,updated_at) SELECT ?,?,?,1,? WHERE ?=0
 ON CONFLICT(user_id,draft_key) DO UPDATE SET content=excluded.content,revision=drafts.revision+1,updated_at=excluded.updated_at WHERE drafts.revision=? RETURNING revision,updated_at`).bind(actor.id,key,JSON.stringify(content),now,body.revision,body.revision).first();
 // Existing revisions use a separate conditional update because INSERT SELECT is empty for revision>0.
 if(saved)return saved;
 if(Number(body.revision)>0){const updated=await env.DB.prepare('UPDATE drafts SET content=?,revision=revision+1,updated_at=? WHERE user_id=? AND draft_key=? AND revision=? RETURNING revision,updated_at').bind(JSON.stringify(content),now,actor.id,key,body.revision).first();if(updated)return updated;}
 fail(409,'다른 창에서 임시 저장 내용이 변경되었습니다. 현재 내용을 복사한 뒤 다시 열어 주세요.');
}
export async function notifications(env:Env,actor:Actor){
 const rows=await env.DB.prepare('SELECT n.*,t.title FROM notifications n JOIN tasks t ON t.id=n.task_id WHERE n.user_id=? ORDER BY n.created_at DESC,n.id DESC LIMIT 50').bind(actor.id).all();
 const count=await env.DB.prepare('SELECT count(*) n FROM notifications WHERE user_id=? AND read_at IS NULL').bind(actor.id).first<{n:number}>();
 return {items:rows.results,unread:count?.n||0};
}
export async function readNotification(env:Env,actor:Actor,id:string){await env.DB.prepare('UPDATE notifications SET read_at=COALESCE(read_at,?) WHERE id=? AND user_id=?').bind(new Date().toISOString(),id,actor.id).run();return {ok:true};}
