import {tr} from './i18n';
import {useEffect,useState} from 'react';
import {api} from './api';
import {uiLanguage} from './i18n';

export function useReportTranslation(notes:{id:string;note:string}[],enabled:boolean){
 const fingerprint=JSON.stringify(notes.map(n=>[n.id,n.note]));
 const [result,setResult]=useState<{fingerprint:string;notes:Record<string,string>}|null>(null);
 const [original,setOriginal]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  if(!enabled)return;
  let alive=true;setBusy(true);setError('');
  void (async()=>{
   const translated:Record<string,string>={};
   try{
    for(const item of JSON.parse(fingerprint) as [string,string][]){
     if(!alive)return;
     const [id,text]=item;
     if(!text?.trim())continue;
     translated[id]=(await api<{text:string}>('/ai/text',{text,language:uiLanguage,operation:'translate',context:'report'})).text;
    }
    if(alive)setResult({fingerprint,notes:translated});
   }catch(e){if(alive)setError((e as Error).message);}
   finally{if(alive)setBusy(false);}
  })();
  return()=>{alive=false};
 },[fingerprint,enabled,retry]);
 const ready=enabled&&result?.fingerprint===fingerprint;
 return {note:(id:string,text:string)=>ready&&!original?(result.notes[id]??text):text,
 controls:enabled&&notes.some(n=>n.note?.trim())?<div className="text-assistant">
  {busy?<p role="status">{tr("보고 내용을 번역하고 있습니다…")}</p>:ready?<><p>{tr("AI 번역 · 원문과 사실을 확인해 주세요.")}</p><button type="button" onClick={()=>setOriginal(v=>!v)}>{original?tr("번역 보고 보기"):tr("보고 원문 보기")}</button></>:null}
  {error&&<><p role="alert">{tr("번역을 완료하지 못해 원문을 표시합니다.")} {error}</p><button type="button" disabled={busy} onClick={()=>setRetry(v=>v+1)}>{tr("번역 다시 요청")}</button></>}
 </div>:null};
}
