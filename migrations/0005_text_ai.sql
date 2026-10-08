CREATE TABLE ai_text_runs (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
 operation TEXT NOT NULL, language TEXT NOT NULL, context TEXT NOT NULL,
 source_text TEXT NOT NULL, result_text TEXT, status TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE INDEX ai_text_runs_user_date ON ai_text_runs(user_id,created_at);
CREATE INDEX ai_text_runs_date ON ai_text_runs(created_at);
