import {useEffect,useState} from 'react';
import type {TaskDocument,DocumentSnapshot} from '../core/documents';
import {api} from './api';
const fields=['title','description','requirements','evidence_requirements','location_name','target_address','summary','issues'] as const;
export function useDocumentTranslation(source:TaskDocument,language:'ko'|'ja'|null){
 const [result,setResult]=useState<DocumentSnapshot|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[original,setOriginal]=useState(false),[retry,setRetry]=useState(0),[progress,setProgress]=useState({done:0,total:0});
 useEffect(()=>{
  if(!language)return;
  let alive=true;setBusy(true);setError('');setResult(null);setProgress({done:0,total:0});
  void (async()=>{try{
   const path='/documents/'+encodeURIComponent(source.id)+'/translation';
   const cache=await api<{total:number;parts:{part:number;values:Record<string,string>}[]}>(path+'?language='+language);
   if(!alive)return;
   const translated:Record<string,string>={};const completed=new Set<number>();for(const part of cache.parts){Object.assign(translated,part.values);completed.add(part.part);}
   setProgress({done:completed.size,total:cache.total});
   for(let i=0;i<cache.total;i++){if(!alive)return;if(completed.has(i))continue;const result=await api<{values:Record<string,string>}>(path,{language,part:i});Object.assign(translated,result.values);completed.add(i);if(alive)setProgress({done:completed.size,total:cache.total});}
   if(!alive)return;
   const snapshot={...source.snapshot,evidence:source.snapshot.evidence.map((e,i)=>({...e,note:translated['note_'+i]??e.note}))};for(const key of fields)if(translated[key]!==undefined)snapshot[key]=translated[key];setResult(snapshot);
  }catch(e){if(alive)setError((e as Error).message);}finally{if(alive)setBusy(false);}})();return()=>{alive=false};
 },[source.id,language,retry]);
 return {snapshot:result&&!original?result:source.snapshot,busy,error,ready:!!result,original,progress,toggle:()=>setOriginal(v=>!v),retry:()=>setRetry(v=>v+1)};
}
