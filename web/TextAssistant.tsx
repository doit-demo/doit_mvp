import {tr} from './i18n';
import {useEffect,useRef,useState} from 'react';
import {api} from './api';
import {uiLanguage} from './i18n';

export function TextAssistant({value,onApply,context,disabled=false,defaultLanguage=uiLanguage}:{value:string;onApply?:(text:string)=>void;context:'request'|'report';disabled?:boolean;defaultLanguage?:'ko'|'ja'|'en'}){
 const [language,setLanguage]=useState<string>(defaultLanguage),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [draft,setDraft]=useState<{source:string;text:string;language:string;operation:'translate'|'organize'}|null>(null),[undo,setUndo]=useState<{source:string;applied:string}|null>(null);
 const alive=useRef(true),latest=useRef(value);latest.current=value;
 useEffect(()=>()=>{alive.current=false;},[]);
 async function run(operation:'translate'|'organize'){
  if(busy||disabled||!value.trim())return;
  const source=value;setBusy(true);setError('');setDraft(null);
  try{const data=await api<{text:string}>('/ai/text',{text:source,language,operation,context});if(!alive.current)return;if(latest.current!==source){setError(tr("입력 내용이 바뀌어 이전 AI 결과를 적용하지 않았습니다."));return;}setDraft({source,text:data.text,language,operation});}
  catch(e){if(alive.current)setError((e as Error).message);}finally{if(alive.current)setBusy(false);}
 }
 return <div className="text-assistant">
  <div className="ai-tools"><label>{tr("결과 언어")}<select value={language} onChange={e=>{setLanguage(e.target.value);setDraft(null);}} disabled={busy}><option value="ko">{tr("한국어")}</option><option value="ja">日本語</option><option value="en">English</option></select></label><button type="button" disabled={disabled||busy||!value.trim()||value.length>4000} onClick={()=>void run('translate')}>{tr("AI 번역")}</button><button type="button" disabled={disabled||busy||!value.trim()||value.length>4000} onClick={()=>void run('organize')}>{tr("AI 내용 정리")}</button></div>
  <p className="hint">{tr("버튼을 누르면 이 텍스트만 Gemini에 전송됩니다. 사진·영상은 전송하지 않습니다. 4,000자 이내.")}</p>
  {busy&&<p role="status">{tr("AI가 텍스트를 처리하고 있습니다…")}</p>}{error&&<p role="alert">{error}</p>}
  {draft&&<div className="ai-preview"><strong>AI {draft.operation==='translate'?tr("번역"):tr("내용 정리")} {tr("· 요청 언어:")} {draft.language==='ja'?'日本語':draft.language==='en'?'English':tr("한국어")}</strong><p className="hint">{tr("사실과 번역을 확인해 주세요.")}</p><p className="pre">{draft.text}</p>{onApply&&<button type="button" disabled={disabled||value!==draft.source} onClick={()=>{setUndo({source:draft.source,applied:draft.text});onApply(draft.text);setDraft(null);}}>{tr("확인 후 적용")}</button>}<button type="button" onClick={()=>setDraft(null)}>{tr("닫기")}</button><details><summary>{tr("요청 원문")}</summary><p className="pre">{draft.source}</p></details></div>}
  {undo&&onApply&&<button type="button" disabled={disabled||value!==undo.applied} onClick={()=>{onApply(undo.source);setUndo(null);}}>{tr("적용 전 원문 복원")}</button>}
 </div>;
}
