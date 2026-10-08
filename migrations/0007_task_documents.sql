CREATE TABLE task_documents (
 id TEXT PRIMARY KEY,
 task_id TEXT NOT NULL REFERENCES tasks(id),
 kind TEXT NOT NULL CHECK(kind IN ('REQUEST','REPORT')),
 round INTEGER NOT NULL CHECK((kind='REQUEST' AND round=0) OR (kind='REPORT' AND round>=1)),
 schema_version INTEGER NOT NULL DEFAULT 1,
 issued_at TEXT NOT NULL,
 author_name TEXT NOT NULL,
 source TEXT NOT NULL CHECK(source IN ('ISSUED','MIGRATED')),
 snapshot TEXT NOT NULL CHECK(json_valid(snapshot)),
 UNIQUE(task_id,kind,round)
);
-- Existing requests are explicitly marked as reconstructed at migration time.
-- Do not fabricate historical submitted reports from mutable/current data.
INSERT INTO task_documents(id,task_id,kind,round,issued_at,author_name,source,snapshot)
SELECT 'REQ-'||t.id,t.id,'REQUEST',0,strftime('%Y-%m-%dT%H:%M:%fZ','now'),c.name,'MIGRATED',
json_object('title',t.title,'description',t.description,'requirements',t.requirements,'evidence_requirements',t.evidence_requirements,
'client_name',c.name,'agent_name',a.name,'location_name',t.location_name,'target_address',t.target_address,'target_lat',t.target_lat,'target_lng',t.target_lng,
'created_at',t.created_at,'started_at',NULL,'submitted_at',NULL,'summary','','issues','','evidence',json('[]'))
FROM tasks t JOIN users c ON c.id=t.client_id LEFT JOIN users a ON a.id=t.agent_id;
CREATE TRIGGER task_documents_no_update BEFORE UPDATE ON task_documents BEGIN SELECT RAISE(ABORT,'IMMUTABLE_DOCUMENT'); END;
CREATE TRIGGER task_documents_no_delete BEFORE DELETE ON task_documents BEGIN SELECT RAISE(ABORT,'IMMUTABLE_DOCUMENT'); END;
