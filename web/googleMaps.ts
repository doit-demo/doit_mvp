/// <reference types="google.maps" />
import {api} from './api';
export type MapConfig={provider:string;browser_key?:string;tile_url?:string};
let config:Promise<MapConfig>|undefined;
export function getMapConfig(){return config??=api<MapConfig>('/geo/config').catch(error=>{config=undefined;throw error;});}
let loading:Promise<typeof google.maps>|undefined;
export function loadGoogleMaps():Promise<typeof google.maps>{
 return loading??=getMapConfig().then(c=>{
  if(c.provider!=='google'||!c.browser_key)throw new Error('Google 주소 검색 설정을 준비 중입니다. 현재는 지도에서 목적지를 선택해 주세요.');
  const browserKey=c.browser_key;
  return new Promise<typeof google.maps>((resolve,reject)=>{
   const script=document.createElement('script');
   const scope=window as typeof window & {doitGoogleReady?:()=>void;gm_authFailure?:()=>void};
   let settled=false;
   const finish=(error?:Error)=>{if(settled)return;settled=true;clearTimeout(timer);if(error)reject(error);else resolve(google.maps);};
   const timer=setTimeout(()=>finish(new Error('Google 지도 연결 시간이 초과되었습니다. 새로고침 후 다시 시도해 주세요.')),15000);
   scope.doitGoogleReady=()=>finish();
   scope.gm_authFailure=()=>{finish(new Error('Google 지도 인증 설정을 확인해야 합니다.'));window.dispatchEvent(new Event('doit-map-auth-failed'));};
   script.onerror=()=>finish(new Error('Google 지도를 불러오지 못했습니다. 네트워크 연결을 확인해 주세요.'));
   const url=new URL('https://maps.googleapis.com/maps/api/js');
   url.search=new URLSearchParams({key:browserKey,v:'quarterly',loading:'async',callback:'doitGoogleReady',language:'ko'}).toString();
   script.src=url.href;script.async=true;script.referrerPolicy='strict-origin-when-cross-origin';document.head.appendChild(script);
  });
 });
}
export type AddressCandidate={id:string;address:string;lat:number;lng:number;precision:string;partial:boolean;provider?:string};
export async function searchAddress(address:string,country:string):Promise<AddressCandidate[]>{
 const config=await getMapConfig();
 if(config.provider==='maptiler'&&config.browser_key){
  const url=new URL('https://api.maptiler.com/geocoding/'+encodeURIComponent(address.trim())+'.json');
  url.search=new URLSearchParams({key:config.browser_key,limit:'5',autocomplete:'false',...(country?{country:country.toLowerCase()}:{})}).toString();
  let response:Response;
  try{response=await fetch(url,{signal:AbortSignal.timeout(12000),referrerPolicy:'origin'});}catch{throw new Error('주소 검색 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.');}
  if(!response.ok)throw new Error(response.status===429?'주소 검색 한도에 도달했습니다.':'주소 검색에 실패했습니다. 서비스 설정을 확인해 주세요.');
  const data=await response.json() as {features?:{id:string;place_name:string;center:number[];place_type:string[]}[]};
  return (data.features||[]).filter(f=>f.center?.length===2&&f.center.every(Number.isFinite)).map(f=>({id:f.id,address:f.place_name,lat:f.center[1],lng:f.center[0],precision:f.place_type?.includes('address')?'ADDRESS':'APPROXIMATE',partial:false,provider:'MapTiler'}));
 }
 const maps=await loadGoogleMaps();
 const {Geocoder}=await maps.importLibrary('geocoding') as google.maps.GeocodingLibrary;
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('주소 검색 시간이 초과되었습니다. 다시 시도해 주세요.')),12000);
  new Geocoder().geocode({address,...(country?{componentRestrictions:{country}}:{})},(results,status)=>{
   clearTimeout(timer);
   if(status==='ZERO_RESULTS')return resolve([]);
   if(status!=='OK')return reject(new Error(status==='OVER_QUERY_LIMIT'?'주소 검색 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.':'주소 검색에 실패했습니다. 주소 또는 서비스 설정을 확인해 주세요.'));
   resolve((results||[]).slice(0,5).map(r=>({id:r.place_id,address:r.formatted_address,lat:r.geometry.location.lat(),lng:r.geometry.location.lng(),precision:r.geometry.location_type,partial:!!r.partial_match})));
  });
 });
}
