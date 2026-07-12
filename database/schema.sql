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

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT,
  user_id TEXT,
  product_id TEXT,
  channel_id TEXT,
  quantity INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS joki_quest_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER,
  guild_id TEXT,
  user_id TEXT,
  status TEXT DEFAULT 'awaiting_form',
  catatan TEXT,
  submitted_at DATETIME,
  wiped_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS youtube_channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT,
  channel_id TEXT,
  youtube_channel_id TEXT,
  youtube_channel_name TEXT,
  last_check DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS youtube_videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT,
  youtube_video_id TEXT,
  title TEXT,
  url TEXT,
  published_at DATETIME,
  notified_at DATETIME
);
