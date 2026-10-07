PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('CLIENT','AGENT','ADMIN')),
 password_hash TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
 csrf TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS login_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS tasks (
 id TEXT PRIMARY KEY, client_id TEXT NOT NULL REFERENCES users(id), agent_id TEXT REFERENCES users(id),
 title TEXT NOT NULL, description TEXT NOT NULL, location_name TEXT NOT NULL,
 target_address TEXT NOT NULL, target_lat REAL NOT NULL CHECK(target_lat BETWEEN -90 AND 90),
 target_lng REAL NOT NULL CHECK(target_lng BETWEEN -180 AND 180),
 requirements TEXT NOT NULL, evidence_requirements TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('REQUESTED','ASSIGNED','ACCEPTED','IN_PROGRESS','SUBMITTED','VERIFIED','COMPLETED')),
 round INTEGER NOT NULL DEFAULT 1, version INTEGER NOT NULL DEFAULT 0, mutation_id TEXT NOT NULL,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, started_at TEXT, submitted_at TEXT, completed_at TEXT
);
CREATE INDEX IF NOT EXISTS tasks_client ON tasks(client_id,created_at);
CREATE INDEX IF NOT EXISTS tasks_agent ON tasks(agent_id,status);
CREATE TABLE IF NOT EXISTS assignments (
 task_id TEXT PRIMARY KEY REFERENCES tasks(id), agent_id TEXT NOT NULL REFERENCES users(id),
 admin_id TEXT NOT NULL REFERENCES users(id), assigned_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS evidence (
 id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES tasks(id), agent_id TEXT NOT NULL REFERENCES users(id),
 round INTEGER NOT NULL, filename TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL,
 storage_key TEXT NOT NULL UNIQUE, sha256 TEXT NOT NULL, latitude REAL, longitude REAL,
 accuracy REAL, captured_at TEXT, created_at TEXT NOT NULL, note TEXT NOT NULL, removed_at TEXT,
 CHECK((latitude IS NULL AND longitude IS NULL) OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))
);
CREATE INDEX IF NOT EXISTS evidence_task ON evidence(task_id,round);
CREATE TABLE IF NOT EXISTS verifications (
 id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES tasks(id), round INTEGER NOT NULL,
 admin_id TEXT NOT NULL REFERENCES users(id), result TEXT NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit (
 id TEXT PRIMARY KEY, timestamp TEXT NOT NULL, actor_id TEXT NOT NULL REFERENCES users(id),
 actor_role TEXT NOT NULL, task_id TEXT NOT NULL REFERENCES tasks(id), action TEXT NOT NULL, detail TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_task ON audit(task_id,timestamp);
CREATE TRIGGER IF NOT EXISTS enforce_state BEFORE UPDATE OF status ON tasks
WHEN OLD.status <> NEW.status AND NOT (
 (OLD.status='REQUESTED' AND NEW.status='ASSIGNED') OR
 (OLD.status='ASSIGNED' AND NEW.status='ACCEPTED') OR
 (OLD.status='ACCEPTED' AND NEW.status='IN_PROGRESS') OR
 (OLD.status='IN_PROGRESS' AND NEW.status='SUBMITTED') OR
 (OLD.status='SUBMITTED' AND NEW.status IN ('VERIFIED','IN_PROGRESS')) OR
 (OLD.status='VERIFIED' AND NEW.status='COMPLETED')
) BEGIN SELECT RAISE(ABORT,'INVALID_TRANSITION'); END;
CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT,'IMMUTABLE_AUDIT'); END;
CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT,'IMMUTABLE_AUDIT'); END;
