CREATE TABLE drafts (
 user_id TEXT NOT NULL REFERENCES users(id), draft_key TEXT NOT NULL,
 content TEXT NOT NULL CHECK(json_valid(content)), revision INTEGER NOT NULL DEFAULT 1,
 updated_at TEXT NOT NULL, PRIMARY KEY(user_id,draft_key)
);
CREATE TABLE notifications (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), task_id TEXT NOT NULL REFERENCES tasks(id),
 action TEXT NOT NULL, created_at TEXT NOT NULL, read_at TEXT
);
CREATE INDEX notifications_user ON notifications(user_id,created_at);
CREATE TRIGGER notify_assignment AFTER INSERT ON audit WHEN NEW.action='AGENT_AUTO_ASSIGNED'
BEGIN INSERT INTO notifications SELECT NEW.id||'-agent',agent_id,id,NEW.action,NEW.timestamp,NULL FROM tasks WHERE id=NEW.task_id AND agent_id IS NOT NULL; END;
CREATE TRIGGER notify_report AFTER INSERT ON audit WHEN NEW.action='REPORT_SUBMITTED'
BEGIN INSERT INTO notifications SELECT NEW.id||'-client',client_id,id,NEW.action,NEW.timestamp,NULL FROM tasks WHERE id=NEW.task_id; END;
CREATE TRIGGER notify_reexecution AFTER INSERT ON audit WHEN NEW.action='REEXECUTION_REQUESTED'
BEGIN INSERT INTO notifications SELECT NEW.id||'-agent',agent_id,id,NEW.action,NEW.timestamp,NULL FROM tasks WHERE id=NEW.task_id AND agent_id IS NOT NULL; END;
CREATE TRIGGER notify_complete AFTER INSERT ON audit WHEN NEW.action='TASK_COMPLETED'
BEGIN INSERT INTO notifications SELECT NEW.id||'-agent',agent_id,id,NEW.action,NEW.timestamp,NULL FROM tasks WHERE id=NEW.task_id AND agent_id IS NOT NULL; END;
ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1));
CREATE TABLE account_tokens (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
 kind TEXT NOT NULL CHECK(kind IN ('INVITE','RESET')), expires_at INTEGER NOT NULL, used_at TEXT
);
CREATE TABLE operations (
 id TEXT PRIMARY KEY, actor_id TEXT REFERENCES users(id), action TEXT NOT NULL, subject_id TEXT,
 created_at TEXT NOT NULL, detail TEXT NOT NULL
);
CREATE TABLE backup_runs (
 id TEXT PRIMARY KEY, started_at TEXT NOT NULL, finished_at TEXT, status TEXT NOT NULL,
 prefix TEXT NOT NULL, detail TEXT NOT NULL
);
CREATE TABLE document_translation_parts (
 document_id TEXT NOT NULL REFERENCES task_documents(id), language TEXT NOT NULL,
 part INTEGER NOT NULL, version TEXT NOT NULL, result TEXT NOT NULL CHECK(json_valid(result)),
 created_at TEXT NOT NULL, PRIMARY KEY(document_id,language,part,version)
);
CREATE TABLE document_translation_locks (
 document_id TEXT NOT NULL REFERENCES task_documents(id), language TEXT NOT NULL, part INTEGER NOT NULL,
 lease TEXT NOT NULL, expires_at INTEGER NOT NULL, PRIMARY KEY(document_id,language,part)
);
