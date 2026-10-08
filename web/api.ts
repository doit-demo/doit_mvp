import {tr} from './i18n';
export type User={id:string;name:string;email:string;role:string};
export const role=location.pathname.startsWith('/admin')?'ADMIN':location.pathname.startsWith('/agent')?'AGENT':'CLIENT';
let csrf='';
export function setCSRF(value:string){csrf=value;}
export async function api<T=unknown>(path:string,body?:unknown):Promise<T>{const form=body instanceof FormData;const response=await fetch('/api'+path,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:{'x-doit-role':role,...(body===undefined?{}:{'x-csrf-token':csrf}),...(form?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:form?body:JSON.stringify(body)})});const data=await response.json() as {error?:string};if(!response.ok)throw new Error(tr(data.error||'요청을 처리하지 못했습니다.'));return data as T;}
