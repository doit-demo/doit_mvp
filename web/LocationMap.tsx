import {useEffect,useRef,useState} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {api} from './api';
type Point={lat:number;lng:number;label:string};
export function LocationMap({lat,lng,points=[],onChoose}:{lat:number;lng:number;points?:Point[];onChoose?:(lat:number,lng:number)=>void}){
 const host=useRef<HTMLDivElement>(null),map=useRef<L.Map|null>(null),layers=useRef<L.LayerGroup|null>(null),choose=useRef(onChoose);choose.current=onChoose;const [failed,setFailed]=useState(false),[provider,setProvider]=useState('loading');
 const safeLat=Number.isFinite(lat)?lat:37.5665,safeLng=Number.isFinite(lng)?lng:126.978;
 useEffect(()=>{
  if(!host.current)return;
  const m=L.map(host.current,{scrollWheelZoom:false,minZoom:6,maxZoom:19}).setView([safeLat,safeLng],15);
  map.current=m;layers.current=L.layerGroup().addTo(m);let fallback=false,disposed=false;
  function osm(){if(disposed||fallback)return;fallback=true;setProvider('osm');L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(m);}
  void api<{provider:string;tile_url?:string}>('/geo/config').then(config=>{
   if(disposed)return;if(config.provider!=='vworld'||!config.tile_url){osm();return;}
   setProvider('vworld');
   const primary=L.tileLayer(config.tile_url,{minZoom:6,maxZoom:19,referrerPolicy:'origin',attribution:'© <a href="https://www.vworld.kr/" target="_blank" rel="noopener noreferrer">VWorld</a>'});
   primary.on('tileerror',()=>{if(disposed||fallback)return;setFailed(true);m.removeLayer(primary);osm();}).addTo(m);
  }).catch(()=>{setFailed(true);osm();});
  m.on('click',e=>choose.current?.(Number(e.latlng.lat.toFixed(6)),Number(e.latlng.lng.toFixed(6))));
  return()=>{disposed=true;m.remove();map.current=null};
 },[]);
 useEffect(()=>{if(!map.current||!layers.current)return;layers.current.clearLayers();L.circleMarker([safeLat,safeLng],{radius:9,color:'#007f76',fillOpacity:.9}).bindTooltip('목적지').addTo(layers.current);for(const p of points)if(Number.isFinite(p.lat)&&Number.isFinite(p.lng)){const label=document.createElement('span');label.textContent=p.label;L.circleMarker([p.lat,p.lng],{radius:6,color:'#bd762b',fillOpacity:.8}).bindTooltip(label).addTo(layers.current)}map.current.setView([safeLat,safeLng],map.current.getZoom());},[safeLat,safeLng,JSON.stringify(points)]);
 return <div className="location-map"><div ref={host} data-testid="location-map" aria-label="목적지와 Evidence 위치 지도"/>{failed&&<p className="hint" role="status">지도 연결에 실패해 OpenStreetMap으로 표시합니다. 좌표 입력은 계속 사용할 수 있습니다.</p>}<p className="hint">{provider==='vworld'?'VWorld 지도':provider==='osm'?'OpenStreetMap 대체 지도':'지도 연결 중'} · {onChoose?'지도를 클릭하여 목적지를 선택하세요.':'초록: 목적지 · 주황: Evidence 위치'} 주소 자동 검색은 아직 연결되지 않았습니다.</p></div>
}
