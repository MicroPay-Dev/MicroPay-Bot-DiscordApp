const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { DATA_DIR, PROJECT_ROOT } = require('../utils/dataDir');

// DB file lives on the (potentially Railway Volume-backed) DATA_DIR.
// schema.sql always ships with the source code, so it's read from the
// project root regardless of where the data itself is stored.
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, 'microstore.db'));
db.pragma('journal_mode = WAL');

// Run schema.sql on boot (idempotent: CREATE TABLE IF NOT EXISTS)
const schemaPath = path.join(PROJECT_ROOT, 'database', 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

// Backward-compat migration: old "guild_settings" -> new "settings" table
const hasOldTable = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='guild_settings'")
  .get();
if (hasOldTable) {
  const rows = db.prepare('SELECT * FROM guild_settings').all();
  const upsert = db.prepare(`INSERT INTO settings(guild_id, welcome_enabled, welcome_channel, verify_enabled, verify_channel, verify_role, buyer_role)
    VALUES (?,?,?,?,?,?,?)
    ON CONFLICT(guild_id) DO UPDATE SET
      welcome_enabled=excluded.welcome_enabled,
      welcome_channel=excluded.welcome_channel,
      verify_enabled=excluded.verify_enabled,
      verify_channel=excluded.verify_channel,
      verify_role=excluded.verify_role,
      buyer_role=excluded.buyer_role`);
  for (const row of rows) {
    upsert.run(
      row.guild_id,
      row.welcome_enabled || 0,
      row.welcome_channel || null,
      row.verify_enabled || 0,
      row.verify_channel || null,
      row.verify_role || null,
      row.buyer_role || null
    );
  }
}

// --- Idempotent column migrations (safe to run every boot) ---
// Adds new columns to existing tables for users who already ran the bot with
// an older schema version. SQLite has no "ADD COLUMN IF NOT EXISTS", so we
// check pragma table_info first.
function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  const exists = cols.some((c) => c.name === column);
  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

ensureColumn('settings', 'welcome_message', 'TEXT');
ensureColumn('settings', 'welcome_role', 'TEXT');
ensureColumn('settings', 'welcome_embed_enabled', 'INTEGER DEFAULT 0');
ensureColumn('settings', 'welcome_embed_title', 'TEXT');
ensureColumn('settings', 'welcome_embed_color', 'TEXT');
ensureColumn('settings', 'welcome_banner_url', 'TEXT');
ensureColumn('settings', 'welcome_thumbnail_url', 'TEXT');
ensureColumn('settings', 'verify_embed_title', 'TEXT');
ensureColumn('settings', 'verify_embed_description', 'TEXT');
ensureColumn('settings', 'verify_embed_color', 'TEXT');
ensureColumn('settings', 'verify_image_url', 'TEXT');
ensureColumn('settings', 'verify_message_id', 'TEXT');
ensureColumn('settings', 'bump_reminder_channel', 'TEXT');
ensureColumn('settings', 'bump_reminder_enabled', 'INTEGER DEFAULT 0');
ensureColumn('settings', 'unverified_role', 'TEXT');
ensureColumn('settings', 'rating_channel', 'TEXT');
ensureColumn('settings', 'testimonial_banner_url', 'TEXT');
ensureColumn('settings', 'empty_catalog_message', 'TEXT');
ensureColumn('orders', 'quantity', 'INTEGER DEFAULT 1');
ensureColumn('settings', 'admin_role', 'TEXT');
ensureColumn('settings', 'log_channel', 'TEXT');
ensureColumn('settings', 'qris_image_url', 'TEXT');

// Ratings table
db.prepare(`CREATE TABLE IF NOT EXISTS ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT,
  order_id INTEGER,
  user_id TEXT,
  stars INTEGER,
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`).run();
ensureColumn('joki_quest_orders', 'discord_email', 'TEXT');
ensureColumn('joki_quest_orders', 'password_discord', 'TEXT');
ensureColumn('joki_quest_orders', 'backup_code', 'TEXT');
ensureColumn('joki_quest_orders', 'wiped_at', 'DATETIME');

module.exports = db;
