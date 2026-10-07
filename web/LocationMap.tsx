import {useEffect,useRef,useState} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
type Point={lat:number;lng:number;label:string};
export function LocationMap({lat,lng,points=[],onChoose}:{lat:number;lng:number;points?:Point[];onChoose?:(lat:number,lng:number)=>void}){
 const host=useRef<HTMLDivElement>(null),map=useRef<L.Map|null>(null),layers=useRef<L.LayerGroup|null>(null),choose=useRef(onChoose);choose.current=onChoose;const [failed,setFailed]=useState(false);
 const safeLat=Number.isFinite(lat)?lat:37.5665,safeLng=Number.isFinite(lng)?lng:126.978;
 useEffect(()=>{if(!host.current)return;const m=L.map(host.current,{scrollWheelZoom:false}).setView([safeLat,safeLng],15);map.current=m;layers.current=L.layerGroup().addTo(m);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).on('tileerror',()=>setFailed(true)).addTo(m);m.on('click',e=>choose.current?.(Number(e.latlng.lat.toFixed(6)),Number(e.latlng.lng.toFixed(6))));return()=>{m.remove();map.current=null}},[]);
 useEffect(()=>{if(!map.current||!layers.current)return;layers.current.clearLayers();L.circleMarker([safeLat,safeLng],{radius:9,color:'#007f76',fillOpacity:.9}).bindTooltip('목적지').addTo(layers.current);for(const p of points)if(Number.isFinite(p.lat)&&Number.isFinite(p.lng)){const label=document.createElement('span');label.textContent=p.label;L.circleMarker([p.lat,p.lng],{radius:6,color:'#bd762b',fillOpacity:.8}).bindTooltip(label).addTo(layers.current)}map.current.setView([safeLat,safeLng],map.current.getZoom());},[safeLat,safeLng,JSON.stringify(points)]);
 return <div className="location-map"><div ref={host} data-testid="location-map" aria-label="목적지와 Evidence 위치 지도"/>{failed&&<p className="hint">지도 타일을 불러오지 못했습니다. 좌표 입력은 계속 사용할 수 있습니다.</p>}<p className="hint">{onChoose?'지도를 클릭하여 목적지를 선택하세요.':'초록: 목적지 · 주황: Evidence 위치'} 주소 자동 검색은 아직 연결되지 않았습니다.</p></div>
}
