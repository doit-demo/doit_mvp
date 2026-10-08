import type {Actor} from './auth.ts';

export type DocumentEvidence={id:string;filename:string;mime:string;size:number;sha256:string;note:string;latitude:number|null;longitude:number|null;accuracy:number|null;created_at:string;location_recorded_at:string|null;captured_at:string|null};
export type DocumentSnapshot={title:string;description:string;requirements:string;evidence_requirements:string;client_name:string;agent_name:string|null;location_name:string;target_address:string;target_lat:number;target_lng:number;created_at:string;started_at:string|null;submitted_at:string|null;summary:string;issues:string;evidence:DocumentEvidence[]};
export type TaskDocument={id:string;task_id:string;kind:'REQUEST'|'REPORT';round:number;schema_version:number;issued_at:string;author_name:string;source:'ISSUED'|'MIGRATED';snapshot:DocumentSnapshot};

// Run inside the same D1 batch as the task mutation. A lost version race cannot issue a document.
export function issueDocument(env:Env,actor:Actor,taskId:string,event:string,kind:'REQUEST'|'REPORT',now:string,summary='',issues=''){
 return env.DB.prepare(`INSERT INTO task_documents(id,task_id,kind,round,schema_version,issued_at,author_name,source,snapshot)
 SELECT ?,t.id,?,CASE WHEN ?='REQUEST' THEN 0 ELSE t.round END,1,?,?,'ISSUED',
 json_object('title',t.title,'description',t.description,'requirements',t.requirements,'evidence_requirements',t.evidence_requirements,
 'client_name',c.name,'agent_name',a.name,'location_name',t.location_name,'target_address',t.target_address,'target_lat',t.target_lat,'target_lng',t.target_lng,
 'created_at',t.created_at,'started_at',t.started_at,'submitted_at',t.submitted_at,'summary',?,'issues',?,
 'evidence',json(CASE WHEN ?='REPORT' THEN (SELECT json_group_array(json_object('id',e.id,'filename',e.filename,'mime',e.mime,'size',e.size,'sha256',e.sha256,'note',e.note,'latitude',e.latitude,'longitude',e.longitude,'accuracy',e.accuracy,'created_at',e.created_at,'captured_at',e.captured_at,'location_recorded_at',e.location_recorded_at)) FROM evidence e WHERE e.task_id=t.id AND e.round=t.round AND e.removed_at IS NULL) ELSE '[]' END))
 FROM tasks t JOIN users c ON c.id=t.client_id LEFT JOIN users a ON a.id=t.agent_id WHERE t.id=? AND t.mutation_id=?`)
 .bind((kind==='REQUEST'?'REQ-':'REP-')+crypto.randomUUID(),kind,kind,now,actor.name,summary,issues,kind,taskId,event);
}
// Call only after visibleTask has checked ownership.
export async function taskDocuments(env:Env,taskId:string):Promise<TaskDocument[]>{
 const rows=await env.DB.prepare('SELECT * FROM task_documents WHERE task_id=? ORDER BY kind DESC,round,issued_at').bind(taskId).all<Omit<TaskDocument,'snapshot'>&{snapshot:string}>();
 return rows.results.map(row=>({...row,snapshot:JSON.parse(row.snapshot) as DocumentSnapshot}));
}
