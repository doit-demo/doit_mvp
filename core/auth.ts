import {timingSafeEqual} from 'node:crypto';
import {bodyJSON,fail,json,textField} from './http.ts';
export type Role='CLIENT'|'AGENT'|'ADMIN';
export type Actor={id:string;name:string;email:string;role:Role;csrf:string;token_hash:string};
export const roles:Role[]=['CLIENT','AGENT','ADMIN'];
const encoder=new TextEncoder();
export async function sha256(data:BufferSource|string){const hash=await crypto.subtle.digest('SHA-256',typeof data==='string'?encoder.encode(data):data);return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');}
export function equal(a:string,b:string){const x=encoder.encode(a),y=encoder.encode(b);return x.length===y.length&&timingSafeEqual(x,y);}
export async function verifyPassword(password:string,stored:string){const [scheme,iterations,salt,expected]=stored.split('$');if(scheme!=='pbkdf2'||iterations!=='100000')return false;const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:encoder.encode(salt),iterations:100000,hash:'SHA-256'},key,256);const actual=Array.from(new Uint8Array(bits),b=>b.toString(16).padStart(2,'0')).join('');return equal(actual,expected);}
function cookie(role:Role,token:string,maxAge:number,secure:boolean){return `doit_${role}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure?'; Secure':''}`;}
export async function login(request:Request,env:Env){
 const body=await bodyJSON(request);const email=textField(body.email,'이메일',200).toLowerCase();const password=textField(body.password,'비밀번호',256);
 const now=Date.now();const key=await sha256(email+'|'+(request.headers.get('cf-connecting-ip')||'local'));
 const limit=await env.DB.prepare('INSERT INTO login_limits(key,count,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<? THEN 1 ELSE count+1 END,reset_at=CASE WHEN reset_at<? THEN ? ELSE reset_at END RETURNING count').bind(key,now+900000,now,now,now+900000).first<{count:number}>();
 if(limit&&limit.count>12)fail(429,'로그인 시도가 많습니다. 15분 후 다시 시도해 주세요.');
 const user=await env.DB.prepare('SELECT * FROM users WHERE email=?').bind(email).first<Actor&{password_hash:string}>();
 const fallback='pbkdf2$100000$00112233445566778899aabbccddeeff$'+'0'.repeat(64);
 const valid=await verifyPassword(password,user?.password_hash||fallback);if(!user||!valid)fail(401,'이메일 또는 비밀번호가 올바르지 않습니다.');
 const token=crypto.randomUUID()+crypto.randomUUID(),csrf=crypto.randomUUID();
 await env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(now),env.DB.prepare('INSERT INTO sessions VALUES (?,?,?,?)').bind(await sha256(token),user.id,csrf,now+28800000)]);
 return json({user:{id:user.id,name:user.name,email:user.email,role:user.role},csrf},200,{'set-cookie':cookie(user.role,token,28800,new URL(request.url).protocol==='https:')});
}
export async function actorFor(request:Request,env:Env){
 const url=new URL(request.url);const role=request.headers.get('x-doit-role')||url.searchParams.get('app');
 if(!roles.includes(role as Role))fail(401,'로그인이 필요합니다.');
 const match=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(`doit_${role}=`));
 if(!match)fail(401,'로그인이 필요합니다.');
 const hash=await sha256(match.slice(match.indexOf('=')+1));
 const actor=await env.DB.prepare('SELECT u.id,u.name,u.email,u.role,s.csrf,s.token_hash FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.role=?').bind(hash,Date.now(),role).first<Actor>();
 if(!actor)fail(401,'로그인이 만료되었습니다.');
 if(!['GET','HEAD'].includes(request.method)&&!equal(request.headers.get('x-csrf-token')||'',actor.csrf))fail(403,'인증 확인이 필요합니다. 다시 로그인해 주세요.');
 return actor;
}
export async function logout(request:Request,env:Env,actor:Actor){await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(actor.token_hash).run();return json({ok:true},200,{'set-cookie':cookie(actor.role,'',0,new URL(request.url).protocol==='https:')});}
export function requireRole(actor:Actor,role:Role){if(actor.role!==role)fail(403,'이 역할은 해당 작업을 수행할 수 없습니다.');}
