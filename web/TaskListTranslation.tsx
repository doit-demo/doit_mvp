import {useEffect,useRef,useState} from 'react';
import {api} from './api';
import {uiLanguage} from './i18n';
import type {Task} from '../core/tasks';

const fields=['title','location_name','target_address'] as const;
export function useTaskListTranslation(tasks:Task[],enabled:boolean,identity:string){
 const cache=useRef(new Map<string,string>());
 const [revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[original,setOriginal]=useState(false),[retry,setRetry]=useState(0);
 const fingerprint=JSON.stringify(tasks.map(t=>fields.map(k=>t[k])));
 useEffect(()=>{cache.current.clear();setOriginal(false);},[identity]);
 useEffect(()=>{
  if(!enabled)return;
  let alive=true;setError('');setBusy(true);
  void(async()=>{
   try{
    const texts=[...new Set((JSON.parse(fingerprint) as string[][]).flat().filter(t=>t?.trim()))];
    const missing=texts.filter(t=>!cache.current.has(t));
    while(missing.length&&alive){
     const batch:Record<string,string>={};let length=2;
     while(missing.length&&Object.keys(batch).length<50){
      const text=missing[0],size=JSON.stringify(text).length+12;
      if(length+size>1800&&Object.keys(batch).length)break;
      missing.shift();batch['f'+Object.keys(batch).length]=text;length+=size;
     }
     const response=await api<{text:string}>('/ai/text',{text:JSON.stringify(batch),language:uiLanguage,operation:'translate',context:'request',format:'field-map'});
     const translated=JSON.parse(response.text) as Record<string,string>;
     if(!alive)return;
     for(const [key,text] of Object.entries(batch)){if(typeof translated[key]!=='string')throw new Error('Invalid translation');cache.current.set(text,translated[key]);}
     setRevision(v=>v+1);
    }
   }catch(e){if(alive)setError((e as Error).message);}
   finally{if(alive)setBusy(false);}
  })();return()=>{alive=false};
 },[fingerprint,enabled,identity,retry]);
 void revision;
 const label=uiLanguage==='ja'?{loading:'業務一覧を翻訳中…',original:'原文を表示',translated:'翻訳を表示',retry:'翻訳を再試行',failed:'翻訳できない項目は原文を表示しています。'}:uiLanguage==='en'?{loading:'Translating task list…',original:'View original',translated:'View translation',retry:'Retry translation',failed:'Untranslated fields are shown in the original language.'}:{loading:'업무 목록 번역 중…',original:'원문 보기',translated:'번역 보기',retry:'번역 다시 요청',failed:'번역하지 못한 항목은 원문으로 표시합니다.'};
 return {tasks:tasks.map(t=>original?t:{...t,...Object.fromEntries(fields.map(k=>[k,cache.current.get(t[k])??t[k]]))}),controls:enabled&&tasks.length?<div className="panel-title">
  {busy&&<span role="status">{label.loading}</span>}
  <button type="button" onClick={()=>setOriginal(v=>!v)}>{original?label.translated:label.original}</button>
  {error&&<div role="alert">{label.failed} {error} <button type="button" disabled={busy} onClick={()=>setRetry(v=>v+1)}>{label.retry}</button></div>}
 </div>:null};
}
