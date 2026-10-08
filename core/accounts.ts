import {type Actor,requireRole,sha256,verifyPassword} from './auth.ts';
import {fail,textField} from './http.ts';
async function passwordHash(value:unknown){const password=textField(value,'비밀번호',256);if(password.length<12)fail(422,'비밀번호는 12자 이상 입력해 주세요.');const salt=crypto.randomUUID();const encoder=new TextEncoder();const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:encoder.encode(salt),iterations:100000,hash:'SHA-256'},key,256);return 'pbkdf2$100000$'+salt+'$'+Array.from(new Uint8Array(bits),b=>b.toString(16).padStart(2,'0')).join('');}
async function confirmPassword(env:Env,actor:Actor,value:unknown){
 const key='account-'+actor.id,now=Date.now();
 const limit=await env.DB.prepare('INSERT INTO login_limits VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<? THEN 1 ELSE count+1 END,reset_at=CASE WHEN reset_at<? THEN ? ELSE reset_at END RETURNING count').bind(key,now+900000,now,now,now+900000).first<{count:number}>();if(limit&&limit.count>12)fail(429,'로그인 시도가 많습니다. 15분 후 다시 시도해 주세요.');
 const user=await env.DB.prepare('SELECT password_hash FROM users WHERE id=? AND active=1').bind(actor.id).first<{password_hash:string}>();if(!user||!await verifyPassword(textField(value,'현재 비밀번호',256),user.password_hash))fail(401,'현재 비밀번호를 확인해 주세요.');
}
function operation(env:Env,actor:Actor,action:string,subject:string){return env.DB.prepare('INSERT INTO operations VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),actor.id,action,subject,new Date().toISOString(),'{}');}
export async function changePassword(env:Env,actor:Actor,body:Record<string,unknown>){await confirmPassword(env,actor,body.current_password);const hash=await passwordHash(body.password);await env.DB.batch([env.DB.prepare('UPDATE users SET password_hash=? WHERE id=?').bind(hash,actor.id),env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(actor.id),env.DB.prepare('DELETE FROM account_tokens WHERE user_id=?').bind(actor.id),operation(env,actor,'PASSWORD_CHANGED',actor.id)]);return {ok:true};}
export async function listUsers(env:Env,actor:Actor){requireRole(actor,'ADMIN');return (await env.DB.prepare('SELECT id,email,name,role,active,auto_assign_enabled,created_at FROM users ORDER BY created_at DESC LIMIT 200').all()).results;}
export async function manageAccount(env:Env,actor:Actor,body:Record<string,unknown>){
 requireRole(actor,'ADMIN');await confirmPassword(env,actor,body.current_password);
 if(body.action==='invite'){
  const email=textField(body.email,'이메일',200).toLowerCase(),name=textField(body.name,'이름',100),role=body.role;if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!['CLIENT','AGENT'].includes(String(role)))fail(422,'계정 정보를 확인해 주세요.');
  if(await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(email).first())fail(409,'이미 등록된 이메일입니다.');
  const id=crypto.randomUUID(),token=crypto.randomUUID()+crypto.randomUUID(),hash=await sha256(token),now=new Date().toISOString();
  await env.DB.batch([env.DB.prepare('INSERT INTO users(id,email,name,role,password_hash,created_at,auto_assign_enabled,active) VALUES (?,?,?,?,?,?,1,0)').bind(id,email,name,role,'INVITED',now),env.DB.prepare('INSERT INTO account_tokens VALUES (?,?,?,?,NULL)').bind(hash,id,'INVITE',Date.now()+86400000),operation(env,actor,'USER_INVITED',id)]);
  return {code:token,expires_hours:24};
 }
 const id=textField(body.user_id,'계정',100),user=await env.DB.prepare('SELECT id,role,active,password_hash FROM users WHERE id=?').bind(id).first<{id:string;role:string;active:number;password_hash:string}>();if(!user)fail(404,'계정을 찾을 수 없습니다.');if(user.role==='ADMIN')fail(403,'관리자 계정은 본인의 비밀번호 변경을 이용하세요.');
 if(body.action==='reset'){
  if(!user.active&&user.password_hash!=='INVITED')fail(409,'비활성 계정은 먼저 활성화해 주세요.');
  const token=crypto.randomUUID()+crypto.randomUUID();await env.DB.batch([env.DB.prepare('DELETE FROM account_tokens WHERE user_id=?').bind(id),env.DB.prepare('INSERT INTO account_tokens VALUES (?,?,?,?,NULL)').bind(await sha256(token),id,user.password_hash==='INVITED'?'INVITE':'RESET',Date.now()+3600000),operation(env,actor,'RECOVERY_ISSUED',id)]);return {code:token,expires_hours:1};
 }
 if(body.action==='active'){
  if(typeof body.active!=='boolean')fail(422,'Invalid active flag');if(user.password_hash==='INVITED')fail(409,'초대 코드로 가입을 완료해 주세요.');
  if(!body.active&&user.role==='AGENT'&&await env.DB.prepare("SELECT id FROM tasks WHERE agent_id=? AND status<>'COMPLETED' LIMIT 1").bind(id).first())fail(409,'진행 중인 배정 업무를 먼저 완료해 주세요.');
  await env.DB.batch([env.DB.prepare('UPDATE users SET active=? WHERE id=?').bind(body.active?1:0,id),env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(id),env.DB.prepare('DELETE FROM account_tokens WHERE user_id=?').bind(id),operation(env,actor,body.active?'USER_ACTIVATED':'USER_DISABLED',id)]);return {ok:true};
 }
 fail(422,'Invalid account action');
}
export async function redeemAccount(env:Env,body:Record<string,unknown>){
 const token=textField(body.code,'코드',100);if(token.length!==72)fail(400,'유효하지 않거나 만료된 코드입니다.');
 const hash=await sha256(token),now=Date.now();const record=await env.DB.prepare('SELECT t.user_id,t.kind FROM account_tokens t JOIN users u ON u.id=t.user_id WHERE t.token_hash=? AND t.expires_at>? AND t.used_at IS NULL AND (u.active=1 OR (t.kind=\'INVITE\' AND u.password_hash=\'INVITED\'))').bind(hash,now).first<{user_id:string;kind:string}>();if(!record)fail(400,'유효하지 않거나 만료된 코드입니다.');
 const password=await passwordHash(body.password),stamp=crypto.randomUUID();
 const result=await env.DB.batch([
  env.DB.prepare('UPDATE account_tokens SET used_at=? WHERE token_hash=? AND expires_at>? AND used_at IS NULL').bind(stamp,hash,Date.now()),
  env.DB.prepare('UPDATE users SET password_hash=?,active=1 WHERE id=? AND EXISTS(SELECT 1 FROM account_tokens WHERE token_hash=? AND used_at=?)').bind(password,record.user_id,hash,stamp),
  env.DB.prepare('DELETE FROM sessions WHERE user_id=? AND EXISTS(SELECT 1 FROM account_tokens WHERE token_hash=? AND used_at=?)').bind(record.user_id,hash,stamp),
  env.DB.prepare("INSERT INTO operations SELECT ?,NULL,'ACCOUNT_REDEEMED',?,?, '{}' WHERE EXISTS(SELECT 1 FROM account_tokens WHERE token_hash=? AND used_at=?)").bind(crypto.randomUUID(),record.user_id,new Date().toISOString(),hash,stamp)
 ]);if(result[0].meta.changes!==1)fail(409,'이미 사용되었거나 만료된 코드입니다.');return {ok:true};
}
