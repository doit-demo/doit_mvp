import {tr} from './i18n';
import {useEffect,useRef,useState} from 'react';
import {api} from './api';
import {uiLanguage} from './i18n';
import type {Task} from '../core/tasks';

const fields=['title','description','requirements','evidence_requirements','location_name','target_address'] as const;
type Translated=Partial<Pick<Task,typeof fields[number]>>;

export function useRequestTranslation(source:Task,enabled:boolean){
 const [language,setLanguage]=useState<string>(uiLanguage),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [result,setResult]=useState<{fingerprint:string;language:string;values:Translated}|null>(null),[show,setShow]=useState(false);
 const cache=useRef(new Map<string,string>()),running=useRef(false),alive=useRef(true);
 const fingerprint=JSON.stringify([source.id,...fields.map(k=>source[k])]);
 const current=useRef(fingerprint);current.current=fingerprint;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[]);
 const active=show&&result?.fingerprint===fingerprint&&result.language===language;
 async function translate(){
  if(running.current)return;
  if(result?.fingerprint===fingerprint&&result.language===language){setShow(true);return;}
  running.current=true;setBusy(true);setError('');
  try{
   const values:Translated={};
   for(const key of fields){
    if(!alive.current||current.current!==fingerprint)return;
    const text=source[key]||'';
    if(!text.trim()){values[key]=text;continue;}
    const cacheKey=JSON.stringify([language,text]);
    let translated=cache.current.get(cacheKey);
    if(translated===undefined){
     const response=await api<{text:string}>('/ai/text',{text,language,operation:'translate',context:'request'});
     translated=response.text;cache.current.set(cacheKey,translated);
    }
    values[key]=translated;
   }
   if(alive.current&&current.current===fingerprint){setResult({fingerprint,language,values});setShow(true);}
  }catch(e){if(alive.current)setError((e as Error).message);}
  finally{running.current=false;if(alive.current)setBusy(false);}
 }
 useEffect(()=>{if(enabled)void translate()},[enabled,fingerprint,language]);
 return {task:active?{...source,...result.values}:source,controls:enabled?<div className="text-assistant">
  <div className="ai-tools"><label>{tr("번역 언어")}<select value={language} disabled={busy} onChange={e=>{setLanguage(e.target.value);setShow(false);setError('')}}><option value="ja">日本語</option><option value="ko">{tr("한국어")}</option><option value="en">English</option></select></label>
  <button type="button" disabled={busy} onClick={()=>void translate()}>{busy?tr("전체 번역 중…"):active?tr("번역 표시 중"):tr("의뢰 전체 번역 / 一括翻訳")}</button>
  {active&&<button type="button" onClick={()=>setShow(false)}>{tr("원문 보기 / 原文")}</button>}</div>
  <p className="hint">{tr("제목·내용·요청사항·필요 증빙·수행 위치·주소를 함께 번역합니다. 원문은 보존됩니다. 항목별 AI 사용 한도가 적용됩니다.")}</p>
  {active&&<p role="status">{tr("AI 번역 ·")} {language==='ja'?'日本語':language==='en'?'English':tr("한국어")} {tr("· 주소와 고유명사는 원문도 확인해 주세요.")}</p>}
  {error&&<p role="alert">{error} {tr("전체 번역을 적용하지 않았습니다.")}</p>}
 </div>:null};
}
