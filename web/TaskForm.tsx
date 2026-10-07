import {useEffect,useRef,useState} from 'react';
import {LocationMap} from './LocationMap';
import {searchAddress,type AddressCandidate} from './googleMaps';

export function TaskForm({busy,submit,cancel}:{busy:boolean;submit:(body:unknown)=>Promise<void>;cancel:()=>void}){
 const [lat,setLat]=useState(''),[lng,setLng]=useState(''),[address,setAddress]=useState(''),[country,setCountry]=useState('');
 const [results,setResults]=useState<AddressCandidate[]>([]),[searching,setSearching]=useState(false),[message,setMessage]=useState('');
 const generation=useRef(0);
 useEffect(()=>()=>{generation.current++;},[]);
 function invalidate(){generation.current++;setSearching(false);setResults([]);setLat('');setLng('');setMessage('주소가 바뀌었습니다. 다시 검색하거나 지도에서 목적지를 선택해 주세요.');}
 async function search(){
  const query=address.trim();if(!query)return;const current=++generation.current;
  setSearching(true);setResults([]);setLat('');setLng('');setMessage('주소를 검색하고 있습니다…');
  try{const found=await searchAddress(query,country);if(current!==generation.current)return;setResults(found);setMessage(found.length?'주소 후보를 선택한 뒤 지도의 위치를 확인해 주세요.':'검색 결과가 없습니다. 국가와 상세 주소를 확인하거나 지도에서 직접 선택해 주세요.');}
  catch(e){if(current===generation.current)setMessage((e as Error).message);}
  finally{if(current===generation.current)setSearching(false);}
 }
 function pick(a:number,b:number){generation.current++;setSearching(false);setLat(String(a));setLng(String(b));setResults([]);setMessage('목적지 좌표를 선택했습니다. 실제 방문 위치인지 확인해 주세요.');}
 return <section className="panel"><div className="panel-title"><h2>새 현장 업무 의뢰</h2><button onClick={cancel}>취소</button></div>
  <form className="task-form" onSubmit={e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget).entries());void submit({...data,target_lat:Number(lat),target_lng:Number(lng)});}}>
   <label className="full">업무 제목<input name="title" required maxLength={160} placeholder="예: 매장 입구 및 운영 상태 확인"/></label>
   <label className="full">업무 설명<textarea name="description" required placeholder="현장에서 확인해야 할 내용을 구체적으로 작성해 주세요."/></label>
   <label>수행 위치<input name="location_name" required placeholder="장소 이름"/></label>
   <label>검색 국가<select value={country} onChange={e=>{setCountry(e.target.value);invalidate();}}><option value="">전체 국가</option><option value="JP">일본</option><option value="KR">대한민국</option><option value="US">미국</option><option value="GB">영국</option><option value="SG">싱가포르</option></select></label>
   <label className="full">주소<input name="target_address" required maxLength={500} value={address} onChange={e=>{setAddress(e.target.value);invalidate();}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void search();}}} placeholder="일본어·영어·한국어 주소를 그대로 입력하세요"/></label>
   <div className="full"><button type="button" disabled={busy||searching||!address.trim()} onClick={()=>void search()}>{searching?'검색 중…':'주소로 위치 찾기'}</button><p className="hint" role="status">{message||'검색한 주소 후보를 선택하면 지도와 좌표가 함께 변경됩니다.'}</p>
    {!!results.length&&<div className="address-results"><span translate="no">Google Maps</span>{results.map((r,i)=><button key={r.id+'-'+i} type="button" onClick={()=>pick(r.lat,r.lng)}><strong>{r.address}</strong><small>{r.partial?'일부 주소만 일치 · ':''}{r.precision==='ROOFTOP'?'건물 수준 위치':'대략적인 위치 · 건물/입구 확인 필요'}</small></button>)}</div>}
   </div>
   <label>목적지 위도<input type="number" step="any" min="-90" max="90" name="target_lat" required value={lat} onChange={e=>{generation.current++;setSearching(false);setResults([]);setLat(e.target.value);}} placeholder="위치 선택 후 자동 입력"/></label>
   <label>목적지 경도<input type="number" step="any" min="-180" max="180" name="target_lng" required value={lng} onChange={e=>{generation.current++;setSearching(false);setResults([]);setLng(e.target.value);}} placeholder="위치 선택 후 자동 입력"/></label>
   <div className="full">{(!lat||!lng)&&<p className="hint">아직 목적지가 선택되지 않았습니다. 아래 지도 중심은 시작 위치입니다.</p>}<LocationMap lat={lat?Number(lat):37.5665} lng={lng?Number(lng):126.978} onChoose={pick}/></div>
   <label>요청사항<textarea name="requirements" required placeholder="방문 시간, 유의사항 등"/></label>
   <label>필요 사진·동영상<textarea name="evidence_requirements" required placeholder="촬영할 대상과 구도를 알려 주세요."/></label>
   <div className="full"><button className="primary" disabled={busy||searching||!lat||!lng}>{busy?'등록 중…':'의뢰 등록 →'}</button></div>
  </form>
 </section>;
}
