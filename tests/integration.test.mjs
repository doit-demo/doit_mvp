import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import worker from '../core/worker.ts';
import {LocalDB,LocalBucket} from './local-env.mjs';
import {pbkdf2Sync} from 'node:crypto';

let mf,db;
const password='DOIT-test-password!';
const actors=[['c1','CLIENT'],['c2','CLIENT'],['a1','AGENT'],['a2','AGENT'],['admin','ADMIN']];
const sessions={};
before(async()=>{
 db=new LocalDB();
 const env={DB:db,FILES:new LocalBucket(),ENVIRONMENT:'test',VERSION:'test',UPLOAD_MAX_BYTES:'1048576'};
 mf={dispatchFetch:(url,options)=>worker.fetch(new Request(url,options),env,{}),dispose:()=>db.close()};
 const sql=await readFile('migrations/0001_initial.sql','utf8');
 // exec supports multiple SQL statements including triggers.
 await db.exec(sql.replace(/\r?\n/g,' '));
 const salt='00112233445566778899aabbccddeeff';
 const hash=pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex');
 for(const [id,role] of actors)await db.prepare('INSERT INTO users VALUES (?,?,?,?,?,?)').bind(id,id+'@doit.test',id,role,`pbkdf2$100000$${salt}$${hash}`,new Date().toISOString()).run();
});
after(async()=>{await mf?.dispose()});
async function request(path,{actor,method='GET',body,headers={}}={}){
 const session=sessions[actor];
 const role=actors.find(x=>x[0]===actor)?.[1];
 return mf.dispatchFetch('https://doit.test/api'+path,{method,headers:{...(method==='GET'?{}:{origin:'https://doit.test'}),...(body instanceof FormData?{}:{'content-type':'application/json'}),...(session?{cookie:session.cookie,'x-doit-role':role,'x-csrf-token':session.csrf}:{}),...headers},...(body===undefined?{}:{body:body instanceof FormData?body:JSON.stringify(body)})});
}
async function login(id){const r=await request('/auth/login',{method:'POST',body:{email:id+'@doit.test',password}});assert.equal(r.status,200,await r.clone().text());const data=await r.json();sessions[id]={cookie:r.headers.get('set-cookie').split(';')[0],csrf:data.csrf};}
const taskBody={title:'현장 외관 확인',description:'입구 사진과 짧은 영상',location_name:'서울 시청',target_address:'서울 중구 세종대로 110',target_lat:37.5665,target_lng:126.978,requirements:'입구 확인',evidence_requirements:'사진과 영상'};
test('CORE end-to-end and ownership enforcement',async t=>{
 for(const [id] of actors)await login(id);
 let id;
 await t.test('Client creates REQUESTED task and audit',async()=>{const r=await request('/tasks',{actor:'c1',method:'POST',body:taskBody});assert.equal(r.status,201,await r.clone().text());const d=await r.json();id=d.id;assert.equal(d.status,'REQUESTED');});
 await t.test('Other Client cannot read task',async()=>{assert.equal((await request('/tasks/'+id,{actor:'c2'})).status,404)});
 await t.test('Unassigned Agent cannot read task',async()=>{assert.equal((await request('/tasks/'+id,{actor:'a2'})).status,404)});
 await t.test('State skipping is refused',async()=>{assert.equal((await request('/tasks/'+id+'/verify',{actor:'admin',method:'POST',body:{}})).status,409)});
 await t.test('Admin assigns exactly one Agent',async()=>{assert.equal((await request('/tasks/'+id+'/assign',{actor:'admin',method:'POST',body:{agent_id:'a1'}})).status,200);assert.equal((await request('/tasks/'+id+'/assign',{actor:'admin',method:'POST',body:{agent_id:'a2'}})).status,409)});
 await t.test('Agent accepts then starts',async()=>{for(const action of ['accept','start'])assert.equal((await request('/tasks/'+id+'/'+action,{actor:'a1',method:'POST',body:{}})).status,200)});
 await t.test('No evidence cannot submit',async()=>assert.equal((await request('/tasks/'+id+'/submit',{actor:'a1',method:'POST',body:{}})).status,409));
 await t.test('Agent cannot verify',async()=>assert.equal((await request('/tasks/'+id+'/verify',{actor:'a1',method:'POST',body:{}})).status,403));
 await t.test('CSRF is required',async()=>assert.equal((await request('/tasks/'+id+'/submit',{actor:'a1',method:'POST',body:{},headers:{'x-csrf-token':'bad'}})).status,403));
 await t.test('Assigned task and timeline are visible to Client',async()=>{const r=await request('/tasks/'+id,{actor:'c1'});assert.equal(r.status,200);const d=await r.json();assert.equal(d.task.agent_id,'a1');assert.deepEqual(d.timeline.map(x=>x.action),['TASK_CREATED','AGENT_ASSIGNED','TASK_ACCEPTED','EXECUTION_STARTED']);});
 const photo=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=','base64');
 function upload(data=photo,name='site.png',type='image/png'){const form=new FormData();form.append('file',new Blob([data],{type}),name);form.append('latitude','37.5665');form.append('longitude','126.978');form.append('note','현장 확인');return form}
 let evidenceId;
 await t.test('Other Agent cannot upload',async()=>assert.equal((await request('/tasks/'+id+'/evidence',{actor:'a2',method:'POST',body:upload()})).status,404));
 await t.test('Fake image rejected',async()=>assert.equal((await request('/tasks/'+id+'/evidence',{actor:'a1',method:'POST',body:upload('not an image')})).status,415));
 await t.test('Photo stored with SHA-256 and Task reference',async()=>{const r=await request('/tasks/'+id+'/evidence',{actor:'a1',method:'POST',body:upload()});assert.equal(r.status,201,await r.clone().text());const e=await r.json();evidenceId=e.id;assert.equal(e.task_id,id);assert.match(e.sha256,/^[a-f0-9]{64}$/)});
 await t.test('Client can read evidence; other Client cannot',async()=>{const r=await request('/evidence/'+evidenceId+'/content',{actor:'c1'});assert.equal(r.status,200);assert.deepEqual(Buffer.from(await r.arrayBuffer()),photo);assert.equal((await request('/evidence/'+evidenceId+'/content',{actor:'c2'})).status,404)});
 await t.test('Submit, reexecute reason, fresh round evidence required',async()=>{assert.equal((await request('/tasks/'+id+'/submit',{actor:'a1',method:'POST',body:{}})).status,200);assert.equal((await request('/tasks/'+id+'/reexecute',{actor:'admin',method:'POST',body:{reason:''}})).status,422);assert.equal((await request('/tasks/'+id+'/reexecute',{actor:'admin',method:'POST',body:{reason:'입구를 다시 촬영'}})).status,200);assert.equal((await request('/tasks/'+id+'/submit',{actor:'a1',method:'POST',body:{}})).status,409);assert.equal((await request('/tasks/'+id+'/evidence',{actor:'a1',method:'POST',body:upload()})).status,201)});
 await t.test('Admin verification and completion; Client report and audit',async()=>{for(const [action,actor] of [['submit','a1'],['verify','admin'],['complete','admin']])assert.equal((await request('/tasks/'+id+'/'+action,{actor,method:'POST',body:{}})).status,200);const d=await(await request('/tasks/'+id+'/report',{actor:'c1'})).json();assert.equal(d.task.status,'COMPLETED');assert.equal(d.evidence.length,2);assert.equal(d.evidence[0].distance_m,0);assert.equal(d.verifications.length,2);assert.equal(d.timeline.at(-1).action,'TASK_COMPLETED')});
 await t.test('Completed evidence immutable',async()=>assert.equal((await request('/tasks/'+id+'/evidence',{actor:'a1',method:'POST',body:upload()})).status,409));
});
