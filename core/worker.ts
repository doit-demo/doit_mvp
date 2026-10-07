import {ApiError,bodyJSON,fail,json} from './http.ts';
import {actorFor,login,logout,requireRole} from './auth.ts';
import {createTask,listTasks,report,transition} from './tasks.ts';
import {uploadEvidence,evidenceContent,removeEvidence} from './evidence.ts';
import {assets} from './assets.ts';
import {mapTile,mapConfig} from './geo.ts';
export default {async fetch(request:Request,env:Env,_ctx:ExecutionContext):Promise<Response>{
 try{
  const url=new URL(request.url),path=url.pathname;
  if(['GET','HEAD'].includes(request.method)&&!path.startsWith('/api/')){const asset=assets[['/','/client','/agent','/admin'].includes(path)?'/':path];if(!asset)fail(404,'경로를 찾을 수 없습니다.');return new Response(request.method==='HEAD'?null:asset.body,{headers:{'content-type':asset.type,'cache-control':'no-cache','x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'strict-origin-when-cross-origin','content-security-policy':"default-src 'self'; script-src 'self' https://*.googleapis.com https://*.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https://tile.openstreetmap.org https://api.vworld.kr https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.googleusercontent.com; media-src 'self' blob:; connect-src 'self' https://*.googleapis.com https://*.gstatic.com https://*.google.com; worker-src blob:; frame-src https://*.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"}});}
  if(!['GET','HEAD'].includes(request.method)&&request.headers.get('origin')!==url.origin)fail(403,'허용되지 않은 요청 출처입니다.');
  if(path==='/api/health'){let db=false,storage=false;try{await env.DB.prepare('SELECT 1 FROM users LIMIT 1').first();db=true;}catch{}try{if(env.FILES){await env.FILES.list({limit:1});storage=true;}}catch{}return json({version:env.VERSION,core:true,api:true,db,storage,geo:env.GOOGLE_MAPS_BROWSER_KEY?'google':env.VWORLD_BROWSER_ENABLED==='true'&&env.VWORLD_API_KEY?'vworld':'fallback',geo_status:env.GOOGLE_MAPS_BROWSER_KEY||env.VWORLD_BROWSER_ENABLED==='true'?'browser_configured':'domain_confirmation_pending',ready:db&&storage},db&&storage?200:503);}
  if(path==='/api/auth/login'&&request.method==='POST')return await login(request,env);
  const actor=await actorFor(request,env);
  if(path==='/api/geo/config'&&request.method==='GET')return mapConfig(env);
  if(path.startsWith('/api/geo/tiles/')&&request.method==='GET')return await mapTile(request,env,path);
  if(path==='/api/auth/me'&&request.method==='GET')return json({user:{id:actor.id,name:actor.name,email:actor.email,role:actor.role},csrf:actor.csrf});
  if(path==='/api/auth/logout'&&request.method==='POST')return await logout(request,env,actor);
  if(path==='/api/agents'&&request.method==='GET'){requireRole(actor,'ADMIN');return json((await env.DB.prepare("SELECT id,name,email FROM users WHERE role='AGENT' ORDER BY name").all()).results);}
  if(path==='/api/tasks'){if(request.method==='GET')return json(await listTasks(env,actor,url));if(request.method==='POST')return json(await createTask(env,actor,await bodyJSON(request)),201);}
  const ev=path.match(/^\/api\/evidence\/([^/]+)\/(content|remove)$/);if(ev){if(ev[2]==='content'&&['GET','HEAD'].includes(request.method))return await evidenceContent(request,env,actor,ev[1]);if(ev[2]==='remove'&&request.method==='POST')return json(await removeEvidence(env,actor,ev[1],(await bodyJSON(request)).reason));}
  const task=path.match(/^\/api\/tasks\/([^/]+)(?:\/([^/]+))?$/);
  if(task){if(request.method==='GET'&&(!task[2]||task[2]==='report'))return json(await report(env,actor,task[1]));if(request.method==='POST'&&task[2]==='evidence')return json(await uploadEvidence(request,env,actor,task[1]),201);if(request.method==='POST'&&task[2])return json(await transition(env,actor,task[1],task[2],await bodyJSON(request)));}
  fail(404,'경로를 찾을 수 없습니다.');
 }catch(error){if(error instanceof ApiError)return json({error:error.message},error.status);console.error(JSON.stringify({event:'request_failed',message:error instanceof Error?error.message:'unknown'}));return json({error:'서버 처리 중 오류가 발생했습니다. 다시 시도해 주세요.'},500);}
}};
