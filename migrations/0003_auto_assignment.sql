ALTER TABLE users ADD COLUMN auto_assign_enabled INTEGER NOT NULL DEFAULT 1 CHECK(auto_assign_enabled IN (0,1));
-- The second agent is an ownership-isolation test account, not an operational agent.
UPDATE users SET auto_assign_enabled=0 WHERE email='otheragent@doit.test';
ALTER TABLE assignments RENAME TO assignments_legacy;
CREATE TABLE assignments (
 task_id TEXT PRIMARY KEY REFERENCES tasks(id), agent_id TEXT NOT NULL REFERENCES users(id),
 admin_id TEXT REFERENCES users(id), assigned_at TEXT NOT NULL
);
INSERT INTO assignments SELECT * FROM assignments_legacy;
DROP TABLE assignments_legacy;

-- Bring existing unassigned requests into the automatic flow as well.
UPDATE tasks SET agent_id=(
 SELECT u.id FROM users u LEFT JOIN tasks active ON active.agent_id=u.id AND active.status<>'COMPLETED'
 WHERE u.role='AGENT' AND u.auto_assign_enabled=1
 GROUP BY u.id ORDER BY count(active.id),u.created_at,u.id LIMIT 1
),status='ASSIGNED',version=version+1,mutation_id='AUTO-'||lower(hex(randomblob(16))),updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE status='REQUESTED' AND agent_id IS NULL
AND EXISTS(SELECT 1 FROM users WHERE role='AGENT' AND auto_assign_enabled=1);
INSERT INTO assignments(task_id,agent_id,admin_id,assigned_at)
SELECT id,agent_id,NULL,updated_at FROM tasks WHERE mutation_id LIKE 'AUTO-%';
INSERT INTO audit(id,timestamp,actor_id,actor_role,task_id,action,detail)
SELECT mutation_id,updated_at,client_id,'SYSTEM',id,'AGENT_AUTO_ASSIGNED',json_object('agent_id',agent_id,'from','REQUESTED','to','ASSIGNED')
FROM tasks WHERE mutation_id LIKE 'AUTO-%';
