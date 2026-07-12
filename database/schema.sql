CREATE TABLE IF NOT EXISTS settings (
  guild_id TEXT PRIMARY KEY,
  welcome_enabled INTEGER DEFAULT 0,
  welcome_channel TEXT,
  verify_enabled INTEGER DEFAULT 0,
  verify_channel TEXT,
  verify_role TEXT,
  buyer_role TEXT
);

CREATE TABLE IF NOT EXISTS ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT,
  user_id TEXT,
  rating INTEGER,
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
