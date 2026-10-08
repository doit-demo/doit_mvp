import {useDraft,DraftStatus} from './Drafts';
import {SubmissionPreview} from './SubmissionPreview';
import React,{useState} from 'react';
import {createPortal} from 'react-dom';
import type {TaskDocument} from '../core/documents';
import {role} from './api';
import {useDocumentTranslation} from './DocumentTranslation';
import {tr,tr as translateLabel,uiLanguage} from './i18n';
const date=(v:string|null)=>v?new Date(v).toLocaleString(uiLanguage==='ja'?'ja-JP':uiLanguage==='en'?'en-US':'ko-KR'):'—';
export function Documents({documents}:{documents:TaskDocument[]}){
 const [selected,setSelected]=useState<TaskDocument|null>(null);
 return <section className="panel content"><h2>{tr('의뢰서 · 보고서')}</h2><p className="hint">{tr('발행 문서는 원문으로 보존됩니다. 인쇄 창에서 PDF로 저장할 수 있습니다.')}</p>
 <div className="document-list">{documents.map(d=><button key={d.id} onClick={()=>setSelected(d)}>{tr(d.kind==='REQUEST'?'의뢰서':'보고서')}{d.kind==='REPORT'?` · ${tr('회차')} ${d.round}`:''}<small>{date(d.issued_at)}</small></button>)}</div>
 {!documents.some(d=>d.kind==='REPORT')&&<p className="muted">{tr('보존된 보고서가 없습니다. 새 보고 제출 시 발행됩니다. 기존 결과는 현장 기록에서 확인하세요.')}</p>}
 {selected&&createPortal(<DocumentView key={selected.id} document={selected} close={()=>setSelected(null)}/>,document.body)}
 </section>;
}
function DocumentView({document:d,close}:{document:TaskDocument;close:()=>void}){
 const [compare,setCompare]=useState(false);
 const language=role==='AGENT'?'ja':role==='CLIENT'?'ko':null;
 const translation=useDocumentTranslation(d,language);
 const label=(text:string)=>tr(text,language||uiLanguage);
 return <div className="document-overlay" role="dialog" aria-modal="true" aria-label={label(d.kind==='REQUEST'?'의뢰서':'보고서')}><div className="document-toolbar">
 <button disabled={translation.busy} onClick={()=>window.print()}>{label('인쇄 / PDF 저장')}</button>
 {translation.ready&&<button onClick={translation.toggle}>{label(translation.original?'번역본 보기':'원문 보기 / 原文')}</button>}
 {translation.ready&&<button onClick={()=>setCompare(v=>!v)}>{label(compare?'원문 대조 닫기':'원문과 나란히 보기')}</button>}
 {translation.error&&<button onClick={translation.retry} disabled={translation.busy}>{label('번역 다시 요청')}</button>}
 <button autoFocus onClick={close}>{label('닫기')}</button></div>
 <div className="document-translation-status" role={translation.error?'alert':'status'}>{translation.busy?label('문서를 번역하고 있습니다. 현재 원문을 표시합니다.'):translation.error?label('번역을 완료하지 못해 원문을 표시합니다.')+' '+translation.error:translation.ready&&!translation.original?label('AI 번역본 · 발행 원문은 별도로 보존됩니다.'):label('원문 보기 / 原文')}{translation.busy&&` (${translation.progress.done}/${translation.progress.total})`}</div>
 <div className={compare?'document-compare':''}><DocumentSheet document={{...d,snapshot:translation.snapshot}} language={language||uiLanguage}/>{compare&&<div className="comparison-original"><h2>{label('원문 보기 / 原文')}</h2><DocumentSheet document={d} language={language||uiLanguage}/></div>}</div></div>;
}
function DocumentSheet({document:d,language}:{document:TaskDocument;language:'ko'|'ja'|'en'}){
 const tr=(text:string)=>translateLabel(text,language);

 const s=d.snapshot;
 return <article className="document-sheet"><div className="document-brand">DOIT</div><h1>{tr(d.kind==='REQUEST'?'업무 의뢰서':'업무 수행 보고서')}</h1><p className="document-number">{tr('문서 번호')}: {d.id}<br/>{tr('업무 / Task ID')}: {d.task_id}</p>
 {d.source==='MIGRATED'&&<p className="document-notice">{tr('기존 업무 데이터로 이관 시 생성한 의뢰서입니다. 최초 등록 시점의 원본 발행본은 아닙니다.')}</p>}
 <dl><dt>{tr('발행일')}</dt><dd>{date(d.issued_at)}</dd><dt>{tr('작성자')}</dt><dd>{d.author_name}</dd><dt>{tr('의뢰인')}</dt><dd>{s.client_name}</dd>{d.kind==='REPORT'&&<><dt>{tr('담당 Agent')}</dt><dd>{s.agent_name||'—'}</dd><dt>{tr('회차')}</dt><dd>{d.round}</dd></>}<dt>{tr('생성일')}</dt><dd>{date(s.created_at)}</dd><dt>{tr('수행 위치')}</dt><dd>{s.location_name}<br/>{s.target_address}<br/>{s.target_lat}, {s.target_lng}</dd></dl>
 <h2>{s.title}</h2><h3>{tr('의뢰 목적 / 확인 항목')}</h3><p className="pre">{s.description}</p><h3>{tr('요청사항')}</h3><ul className="document-checklist">{s.requirements.split(/\n+/).filter(v=>v.trim()).map((v,i)=><li key={i}>{v}</li>)}</ul><h3>{tr('필요 Evidence')}</h3><ul className="document-checklist">{s.evidence_requirements.split(/\n+/).filter(v=>v.trim()).map((v,i)=><li key={i}>{v}</li>)}</ul>
 {d.kind==='REPORT'&&<><dl><dt>{tr('업무 시작')}</dt><dd>{date(s.started_at)}</dd><dt>{tr('보고 제출')}</dt><dd>{date(s.submitted_at)}</dd></dl><h2>{tr('수행 결과')}</h2><p className="pre">{s.summary}</p><h3>{tr('특이사항 / 미완료 사항')}</h3><p className="pre">{s.issues||'—'}</p><h2>{tr('증거 자료')}</h2>{s.evidence.map(e=><section className="document-evidence" key={e.id}><h3>{e.filename}</h3>{e.mime.startsWith('image/')&&<img src={'/api/evidence/'+e.id+'/content?app='+role} alt={e.note||e.filename}/>}<p className="pre">{e.note||'—'}</p><p>{e.mime} · {(e.size/1048576).toFixed(2)} MB<br/>{tr('생성일')}: {date(e.created_at)}<br/>GPS: {e.latitude===null?'—':`${e.latitude}, ${e.longitude} (±${e.accuracy??'—'} m)`}<br/>{tr('GPS 수집:')} {date(e.location_recorded_at)}<br/>{tr('촬영 시각:')} {date(e.captured_at)}</p><p className="document-number">{e.id}<br/>SHA-256: {e.sha256}</p></section>)}</>}
 <p className="document-page-footer">DOIT · {d.id} · {tr('회차')} {d.kind==='REPORT'?d.round:'—'}</p><p className="document-notice">{tr('문서는 발행 당시 내용을 보존합니다. 최신 진행 상태는 업무 화면에서 확인하세요. 영상 원본은 로그인 후 업무 화면에서 재생할 수 있습니다.')}</p>
 </article>;
}
export function ReportComposer({busy,onSubmit,taskId,round}:{taskId:string;round:number;busy:boolean;onSubmit:(body:{summary:string;issues:string})=>Promise<void>}){
 const [summary,setSummary]=useState(''),[issues,setIssues]=useState(''),[preview,setPreview]=useState(false);
 const draft=useDraft('report:'+taskId+':'+round,d=>{setSummary(d.summary||'');setIssues(d.issues||'');});
 return <form className="report-composer" onSubmit={e=>{e.preventDefault();setPreview(true)}}><fieldset disabled={busy||draft.loading||draft.saving}><h3>{tr('보고서 작성')}</h3><DraftStatus draft={draft}/ ><label>{tr('수행 결과')}<textarea required maxLength={4000} value={summary} onChange={e=>setSummary(e.target.value)} disabled={busy}/></label><label>{tr('특이사항 / 미완료 사항')}<textarea maxLength={4000} value={issues} onChange={e=>setIssues(e.target.value)} disabled={busy}/></label><p className="hint">{tr('현재 회차의 증거 자료와 함께 제출됩니다. 제출 후 문서 내용은 변경할 수 없습니다.')}</p><p className="hint">{tr('임시 저장 후 다른 기기에서도 이어서 작성할 수 있습니다.')}</p><button type="button" disabled={busy||draft.loading||draft.saving} onClick={()=>void draft.save({summary,issues})}>{tr("임시 저장")}</button><button className="primary" disabled={busy||draft.loading||draft.saving||!summary.trim()}>{tr('보고서 발행 / 제출')}</button></fieldset>{preview&&<SubmissionPreview title="보고서 제출 전 확인" fields={[["수행 결과",summary],["특이사항 / 미완료 사항",issues]]} busy={busy} close={()=>setPreview(false)} confirm={()=>{setPreview(false);void onSubmit({summary,issues});}}/>}</form>;
}
