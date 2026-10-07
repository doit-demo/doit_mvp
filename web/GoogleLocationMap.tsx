import {useEffect,useRef,useState} from 'react';
import {loadGoogleMaps} from './googleMaps';
export type LocationProps={lat:number;lng:number;points?:{lat:number;lng:number;label:string}[];onChoose?:(lat:number,lng:number)=>void};
export function GoogleLocationMap({lat,lng,points=[],onChoose}:LocationProps){
 const host=useRef<HTMLDivElement>(null),map=useRef<google.maps.Map|null>(null),circles=useRef<google.maps.Circle[]>([]),choose=useRef(onChoose);
 const [ready,setReady]=useState(false),[error,setError]=useState('');choose.current=onChoose;
 useEffect(()=>{
  let disposed=false;
  const authFailed=()=>{if(!disposed)setError('Google 지도 인증에 실패했습니다. 관리자에게 설정 확인을 요청해 주세요.');};
  window.addEventListener('doit-map-auth-failed',authFailed);
  void loadGoogleMaps().then(async maps=>{
   const {Map}=await maps.importLibrary('maps') as google.maps.MapsLibrary;
   if(disposed||!host.current)return;
   map.current=new Map(host.current,{center:{lat,lng},zoom:15,gestureHandling:'cooperative',streetViewControl:false,mapTypeControl:false});
   map.current.addListener('click',(e:google.maps.MapMouseEvent)=>{if(e.latLng)choose.current?.(Number(e.latLng.lat().toFixed(6)),Number(e.latLng.lng().toFixed(6)));});setReady(true);
  }).catch(e=>{if(!disposed)setError(e.message);});
  return()=>{disposed=true;window.removeEventListener('doit-map-auth-failed',authFailed);circles.current.forEach(c=>c.setMap(null));if(map.current)google.maps.event.clearInstanceListeners(map.current);map.current=null;};
 },[]);
 useEffect(()=>{
  if(!ready||!map.current)return;circles.current.forEach(c=>c.setMap(null));
  circles.current=[{lat,lng,label:'목적지'},...points].map((p,i)=>new google.maps.Circle({map:map.current,center:{lat:p.lat,lng:p.lng},radius:i?12:18,strokeColor:i?'#bd762b':'#007f76',fillColor:i?'#bd762b':'#007f76',fillOpacity:.8,strokeWeight:2,clickable:false}));
  map.current.panTo({lat,lng});
 },[ready,lat,lng,JSON.stringify(points)]);
 return <div className="location-map"><div ref={host} data-testid="location-map" aria-label="Google 목적지와 Evidence 위치 지도"/>{error&&<p role="alert">{error}</p>}<p className="hint">Google Maps · {onChoose?'주소 검색 후 지도에서 목적지를 확인하거나 클릭해 조정하세요.':'초록: 목적지 · 주황: Evidence 위치'}</p></div>;
}
