// Daily private recovery bundle. No public route exposes these objects.
const tables=['users','tasks','assignments','evidence','verifications','audit','task_documents','drafts','notifications','operations','document_translation_parts'] as const;
export async function scheduledBackup(env:Env){
 const now=new Date().toISOString(),id=now.slice(0,10),prefix='_backups/daily/'+id;
 const claimed=await env.DB.prepare("INSERT OR IGNORE INTO backup_runs VALUES (?,?,NULL,'RUNNING',?,'')").bind(id,now,prefix).run();if(!claimed.meta.changes)return;
 try{
  // A single D1 batch provides a transactionally consistent, bounded application snapshot.
  const result=await env.DB.batch<Record<string,unknown>>(tables.map(table=>env.DB.prepare('SELECT * FROM '+table+' LIMIT 1001')));
  const snapshot:Record<string,Record<string,unknown>[]>={};for(let i=0;i<tables.length;i++){if(result[i].results.length>1000)throw Error('Backup row limit reached: '+tables[i]);snapshot[tables[i]]=result[i].results;}
  const body=JSON.stringify({format:1,created_at:now,tables:snapshot});if(new TextEncoder().encode(body).length>20*1024*1024)throw Error('Backup snapshot exceeds 20 MB');
  await env.FILES.put(prefix+'/database.json',body,{httpMetadata:{contentType:'application/json'}});
  const files:{source:string;backup:string;sha256:string}[]=[];const deadline=Date.now()+240000;
  for(const row of snapshot.evidence){
   if(Date.now()>deadline)throw Error('Backup time budget exceeded');
   const source=String(row.storage_key),hash=String(row.sha256),backup='_backups/files/'+hash;
   const existing=await env.FILES.head(backup);
   if(!existing||existing.size!==Number(row.size)||existing.customMetadata?.sha256!==hash){
    const original=await env.FILES.get(source);if(!original)throw Error('Original evidence missing: '+String(row.id));
    await env.FILES.put(backup,original.body,{sha256:hash,httpMetadata:original.httpMetadata,customMetadata:{sha256:hash}});
   }
   files.push({source,backup,sha256:hash});
  }
  await env.FILES.put(prefix+'/manifest.json',JSON.stringify({format:1,created_at:now,status:'COMPLETE',database:prefix+'/database.json',files,excluded:['sessions','login_limits','account_tokens','ai_text_runs','document_translation_locks']}),{httpMetadata:{contentType:'application/json'}});
  await env.DB.prepare("UPDATE backup_runs SET status='COMPLETE',finished_at=?,detail=? WHERE id=?").bind(new Date().toISOString(),files.length+' evidence files protected',id).run();
 }catch(e){await env.DB.prepare("UPDATE backup_runs SET status='FAILED',finished_at=?,detail=? WHERE id=?").bind(new Date().toISOString(),e instanceof Error?e.message:'Backup failed',id).run();throw e;}
}

