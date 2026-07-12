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

CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT,
  type TEXT,
  message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT,
  order_id INTEGER,
  user_id TEXT,
  amount INTEGER,
  status TEXT DEFAULT 'pending',
  proof_url TEXT,
  reviewed_by TEXT,
  reviewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT,
  name TEXT,
  type TEXT DEFAULT 'general',
  price INTEGER,
  description TEXT,
  delivery_content TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT,
  user_id TEXT,
  channel_id TEXT,
  type TEXT,
  status TEXT DEFAULT 'open',
  closed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transcripts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT,
  channel_id TEXT,
  channel_name TEXT,
  ticket_type TEXT,
  user_id TEXT,
  content TEXT,
  file_path TEXT,
  exported_at DATETIME
);

CREATE TABLE IF NOT EXISTS vip_files (
  guild_id TEXT PRIMARY KEY,
  file_path TEXT,
  original_name TEXT,
  uploaded_by TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS web_panel_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER,
  guild_id TEXT,
  user_id TEXT,
  status TEXT DEFAULT 'awaiting_form',
  website_name TEXT,
  brand_name TEXT,
  domain TEXT,
  description TEXT,
  extra_features TEXT,
  notes TEXT,
  submitted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
