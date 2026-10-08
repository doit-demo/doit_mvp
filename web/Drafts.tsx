import {useCallback,useEffect,useRef,useState} from 'react';
import {api} from './api';
import {tr} from './i18n';
export function useDraft(key:string,onRestore:(content:Record<string,string>)=>void){
 const restore=useRef(onRestore);restore.current=onRestore;
 const revision=useRef(0),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[savedAt,setSavedAt]=useState('');
 const loadingRef=useRef(true),savingRef=useRef(false);
 useEffect(()=>{let alive=true;setLoading(true);loadingRef.current=true;void api<{content:Record<string,string>|null;revision:number;updated_at:string|null}>('/drafts/'+encodeURIComponent(key)).then(d=>{if(!alive)return;revision.current=d.revision;if(d.content)restore.current(d.content);setSavedAt(d.updated_at||'');}).catch(e=>{if(alive)setError(e.message)}).finally(()=>{if(alive){setLoading(false);loadingRef.current=false;}});return()=>{alive=false};},[key]);
 const save=useCallback(async(content:Record<string,string>)=>{
  if(loadingRef.current||savingRef.current)return false;
  savingRef.current=true;setSaving(true);setError('');
  try{const data=await api<{revision:number;updated_at:string}>('/drafts/'+encodeURIComponent(key),{revision:revision.current,content});revision.current=data.revision;setSavedAt(data.updated_at);return true;}
  catch(e){setError((e as Error).message);return false;}finally{savingRef.current=false;setSaving(false);}
 },[key]);
 return {loading,saving,error,savedAt,save,revision:()=>revision.current};
}
export function DraftStatus({draft}:{draft:ReturnType<typeof useDraft>}){return <p className="hint" role={draft.error?'alert':'status'}>{draft.error||tr(draft.loading?'임시 저장 불러오는 중…':draft.saving?'저장 중…':draft.savedAt?'임시 저장 완료':'임시 저장 버튼으로 작성 내용을 보관하세요.')}{draft.savedAt&&!draft.error?' · '+new Date(draft.savedAt).toLocaleString():''}</p>;}
