import {fail} from './http.ts';
let cached:{identity:string;token:string;expires:number}|undefined;
const encode=(value:string|Uint8Array)=>btoa(typeof value==='string'?value:String.fromCharCode(...value)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');

export async function vertexAccess(env:Env){
 if(!env.GCP_SERVICE_ACCOUNT_JSON||!env.GCP_PROJECT_ID)fail(503,'AI 연결 준비 중입니다. Google Cloud 인증 설정 후 사용할 수 있습니다.');
 const account=JSON.parse(env.GCP_SERVICE_ACCOUNT_JSON) as {client_email:string;private_key:string;private_key_id:string};
 const identity=account.client_email+account.private_key_id;
 if(cached?.identity===identity&&cached.expires>Date.now()+60000)return cached.token;
 const now=Math.floor(Date.now()/1000);
 const header=encode(JSON.stringify({alg:'RS256',typ:'JWT'}));
 const claims=encode(JSON.stringify({iss:account.client_email,scope:'https://www.googleapis.com/auth/cloud-platform',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600}));
 const bytes=Uint8Array.from(atob(account.private_key.replace(/-----[^-]+-----/g,'').replace(/\s/g,'')),c=>c.charCodeAt(0));
 const key=await crypto.subtle.importKey('pkcs8',bytes,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
 const unsigned=header+'.'+claims;
 const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(unsigned));
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:unsigned+'.'+encode(new Uint8Array(signature))}),signal:AbortSignal.timeout(10000),redirect:'manual'});
 if(!response.ok){await response.body?.cancel();fail(503,'Google Cloud 인증에 실패했습니다.');}
 const data=await response.json() as {access_token?:string;expires_in?:number};
 if(!data.access_token)fail(503,'Google Cloud 인증 응답을 확인할 수 없습니다.');
 cached={identity,token:data.access_token,expires:Date.now()+Math.min(data.expires_in||3600,3600)*1000};return data.access_token;
}
