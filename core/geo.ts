import {fail,json} from './http.ts';

export function mapConfig(env:Env){
 if(env.VWORLD_BROWSER_ENABLED!=='true'||!env.VWORLD_API_KEY)return json({provider:'osm',reason:'vworld_domain_pending'});
 return json({provider:'vworld',tile_url:`https://api.vworld.kr/req/wmts/1.0.0/${encodeURIComponent(env.VWORLD_API_KEY)}/Base/{z}/{y}/{x}.png`});
}

// Fixed provider and layer: callers cannot select an upstream URL or expose the key.
export async function mapTile(request:Request,env:Env,path:string){
 const match=path.match(/^\/api\/geo\/tiles\/(\d+)\/(\d+)\/(\d+)\.png$/);
 if(!match)fail(422,'지도 좌표가 올바르지 않습니다.');
 const [z,x,y]=match.slice(1).map(Number);
 if(![z,x,y].every(Number.isSafeInteger)||z<6||z>19||x<0||y<0||x>=2**z||y>=2**z)fail(422,'지도 좌표가 올바르지 않습니다.');
 if(!env.VWORLD_API_KEY)fail(503,'VWorld 지도 설정이 필요합니다.');
 let response:Response;
 try{
  response=await fetch(`https://api.vworld.kr/req/wmts/1.0.0/${encodeURIComponent(env.VWORLD_API_KEY)}/Base/${z}/${y}/${x}.png`,{
   headers:{Referer:new URL(request.url).origin+'/',Accept:'image/png','Accept-Encoding':'identity','User-Agent':'DOIT/0.2 (VWorld map integration)'},redirect:'manual',signal:AbortSignal.timeout(8000)
  });
 }catch(error){
  const detail=error instanceof Error?error.message:'unknown';
  console.warn(JSON.stringify({event:'vworld_connection_failed',detail:detail.replaceAll(env.VWORLD_API_KEY,'[redacted]')}));
  fail(502,'VWorld 지도 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.');
 }
 if(!response.ok||response.headers.get('content-type')?.split(';')[0]!=='image/png'){
  console.warn(JSON.stringify({event:'vworld_invalid_response',status:response.status,type:response.headers.get('content-type'),redirect:response.headers.get('location')?new URL(response.headers.get('location')!, 'https://api.vworld.kr').origin:null}));
  await response.body?.cancel();
  fail(502,'VWorld 지도 응답을 확인할 수 없습니다.');
 }
 return new Response(response.body,{headers:{'content-type':'image/png','cache-control':'private, no-store','x-content-type-options':'nosniff','x-doit-map-provider':'vworld'}});
}
