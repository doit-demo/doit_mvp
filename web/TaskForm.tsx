import {useDraft,DraftStatus} from './Drafts';
import {SubmissionPreview} from './SubmissionPreview';
import {tr} from './i18n';
import {useEffect,useRef,useState} from 'react';
import {TextAssistant} from './TextAssistant';
import {LocationMap} from './LocationMap';
import {searchAddress,getMapConfig,type AddressCandidate} from './googleMaps';

export function TaskForm({busy,submit,cancel}:{busy:boolean;submit:(body:unknown)=>Promise<void>;cancel:()=>void}){
 const [lat,setLat]=useState(''),[lng,setLng]=useState(''),[address,setAddress]=useState(''),[country,setCountry]=useState('');
 const [results,setResults]=useState<AddressCandidate[]>([]),[searching,setSearching]=useState(false),[message,setMessage]=useState('');
 const [description,setDescription]=useState(''),[requirements,setRequirements]=useState(''),[evidenceNeeds,setEvidenceNeeds]=useState('');
 const [title,setTitle]=useState(''),[locationName,setLocationName]=useState(''),[preview,setPreview]=useState(false);
 const content=()=>({title,description,location_name:locationName,target_address:address,target_lat:lat,target_lng:lng,requirements,evidence_requirements:evidenceNeeds,country});
 const draft=useDraft('request',d=>{setTitle(d.title||'');setDescription(d.description||'');setLocationName(d.location_name||'');setAddress(d.target_address||'');setLat(d.target_lat||'');setLng(d.target_lng||'');setRequirements(d.requirements||'');setEvidenceNeeds(d.evidence_requirements||'');setCountry(d.country||'');if(d.target_lat&&d.target_lng){generation.current++;setCenter({lat:Number(d.target_lat),lng:Number(d.target_lng)});}});
 const generation=useRef(0);
 const [center,setCenter]=useState<{lat:number;lng:number}|null>(null),[gpsLabel,setGPSLabel]=useState(tr("현재 위치를 확인하고 있습니다…"));
 useEffect(()=>{let active=true;
  if(!navigator.geolocation){setGPSLabel(tr("현재 위치를 사용할 수 없습니다. 주소를 검색해 주세요."));return;}
  navigator.geolocation.getCurrentPosition(position=>{
   if(!active)return;const point={lat:position.coords.latitude,lng:position.coords.longitude};
   if(generation.current===0)setCenter(point);setGPSLabel(tr("현재 GPS 위치 · 주소를 검색해 업무 목적지를 지정하세요."));
   void getMapConfig().then(async config=>{if(config.provider!=='maptiler'||!config.browser_key)return;const url=new URL(`https://api.maptiler.com/geocoding/${point.lng},${point.lat}.json`);url.search=new URLSearchParams({key:config.browser_key,limit:'1'}).toString();const r=await fetch(url,{signal:AbortSignal.timeout(8000),referrerPolicy:'origin'});if(!r.ok)return;const data=await r.json() as {features?:{place_name?:string}[]};if(active&&data.features?.[0]?.place_name)setGPSLabel(tr("현재 위치: ")+data.features[0].place_name);}).catch(()=>{});
  },()=>{if(active)setGPSLabel(tr("위치 권한이 없거나 GPS를 확인하지 못했습니다. 주소를 검색해 주세요."));},{enableHighAccuracy:true,timeout:10000,maximumAge:60000});
  return()=>{active=false;};
 },[]);
 useEffect(()=>()=>{generation.current++;},[]);
 function invalidate(){generation.current++;setSearching(false);setResults([]);setLat('');setLng('');setMessage(tr("주소가 바뀌었습니다. 다시 검색하거나 지도에서 목적지를 선택해 주세요."));}
 async function search(){
  const query=address.trim();if(!query||searching)return;const current=++generation.current;
  setSearching(true);setResults([]);setLat('');setLng('');setMessage(tr("주소를 검색하고 있습니다…"));
  try{const found=await searchAddress(query,country);if(current!==generation.current)return;setResults(found);if(found.length){const first=found[0];setCenter({lat:first.lat,lng:first.lng});setMessage(tr("검색 위치로 지도를 이동했습니다. 주소와 핀을 확인한 뒤 아래 후보를 선택하거나 지도에서 목적지를 지정하세요."));}else setMessage(tr("검색 결과가 없습니다. 국가와 상세 주소를 확인해 주세요."));}
  catch(e){if(current===generation.current)setMessage((e as Error).message);}
  finally{if(current===generation.current)setSearching(false);}
 }
 function pick(a:number,b:number){generation.current++;setSearching(false);setLat(String(a));setLng(String(b));setCenter({lat:a,lng:b});setResults([]);setMessage(tr("목적지 좌표를 선택했습니다. 실제 방문 위치인지 확인해 주세요."));}
 return <section className="panel"><div className="panel-title"><h2>{tr("새 현장 업무 의뢰")}</h2><button onClick={cancel}>{tr("취소")}</button></div>
  <form className="task-form" onSubmit={e=>{e.preventDefault();if(!lat||!lng||searching)return;setPreview(true);}}>
   <fieldset className="draft-fields full" disabled={draft.loading||draft.saving||busy}><DraftStatus draft={draft}/><label className="full">{tr("업무 제목")}<input name="title" value={title} onChange={e=>setTitle(e.target.value)} required maxLength={160} placeholder={tr("예: 매장 입구 및 운영 상태 확인")}/></label>
   <label className="full">{tr("업무 설명")}<textarea name="description" value={description} onChange={e=>setDescription(e.target.value)} maxLength={4000} required placeholder={tr("현장에서 확인해야 할 내용을 구체적으로 작성해 주세요.")}/></label><div className="full"><TextAssistant context="request" value={description} onApply={setDescription} disabled={busy}/></div>
   <label>{tr("수행 위치")}<input name="location_name" value={locationName} onChange={e=>setLocationName(e.target.value)} maxLength={200} required placeholder={tr("장소 이름")}/></label>
   <label>{tr("검색 국가")}<select value={country} onChange={e=>{setCountry(e.target.value);invalidate();}}><option value="">{tr("전체 국가")}</option><option value="JP">{tr("일본")}</option><option value="KR">{tr("대한민국")}</option><option value="US">{tr("미국")}</option><option value="GB">{tr("영국")}</option><option value="SG">{tr("싱가포르")}</option></select></label>
   <div className="full"><label htmlFor="task-address">{tr("주소")}</label><div className="address-search-row"><input id="task-address" name="target_address" required maxLength={500} value={address} onChange={e=>{setAddress(e.target.value);invalidate();}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void search();}}} placeholder={tr("일본어·영어·한국어 주소를 그대로 입력하세요")}/><button type="button" aria-label={tr("주소 검색")} title={tr("주소 검색")} disabled={busy||searching||!address.trim()} onClick={()=>void search()}>{searching?'…':<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg>}</button></div><p className="hint" role="status">{message||tr("주소 입력 후 돋보기를 누르면 해당 위치로 지도가 이동합니다.")}</p>
    {!!results.length&&<div className="address-results"><span translate="no">{results[0]?.provider||'Google Maps'}</span>{results.map((r,i)=><button key={r.id+'-'+i} type="button" onClick={()=>pick(r.lat,r.lng)}><strong>{r.address}</strong><small>{r.partial?tr("일부 주소만 일치 · "):''}{r.precision==='ROOFTOP'?tr("건물 수준 위치"):r.precision==='ADDRESS'?tr("주소 후보 · 입력 주소와 일치하는지 확인"):tr("지역 수준 후보 · 정확한 주소 위치가 아닐 수 있음")}</small></button>)}</div>}
   </div>
   <input type="hidden" name="target_lat" value={lat}/><input type="hidden" name="target_lng" value={lng}/>
   <div className="full"><p className="hint">{gpsLabel}</p>{(!lat||!lng)&&<p className="hint">{tr("아직 업무 목적지가 확정되지 않았습니다.")}</p>}{center?<LocationMap lat={center.lat} lng={center.lng} onChoose={pick}/>:<div className="map-waiting">{tr("현재 위치를 기다리는 중입니다. 주소를 검색해 지도를 열 수도 있습니다.")}</div>}</div>
   <label>{tr("요청사항")}<textarea name="requirements" value={requirements} onChange={e=>setRequirements(e.target.value)} maxLength={4000} required placeholder={tr("방문 시간, 유의사항 등")}/></label>
   <label>{tr("필요 사진·동영상")}<textarea name="evidence_requirements" value={evidenceNeeds} onChange={e=>setEvidenceNeeds(e.target.value)} maxLength={4000} required placeholder={tr("촬영할 대상과 구도를 알려 주세요.")}/></label><div><TextAssistant context="request" value={requirements} onApply={setRequirements} disabled={busy}/></div><div><TextAssistant context="request" value={evidenceNeeds} onApply={setEvidenceNeeds} disabled={busy}/></div>
   <div className="full button-row"><button type="button" disabled={draft.loading||draft.saving||busy} onClick={()=>void draft.save(content())}>{tr("임시 저장")}</button><button className="primary" disabled={busy||searching||!lat||!lng}>{busy?tr("등록 중…"):tr("의뢰 등록 →")}</button></div>
  </fieldset></form>
 {preview&&<SubmissionPreview title="의뢰서 제출 전 확인" fields={[["업무 제목",title],["의뢰 목적 / 확인 항목",description],["수행 위치",locationName+'\n'+address+'\n'+lat+', '+lng],["요청사항",requirements],["필요 Evidence",evidenceNeeds]]} busy={busy} close={()=>setPreview(false)} confirm={()=>{setPreview(false);void submit({...content(),target_lat:Number(lat),target_lng:Number(lng),draft_revision:draft.revision()});}}/>}
 </section>;
}
