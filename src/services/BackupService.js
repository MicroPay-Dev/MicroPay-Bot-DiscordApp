const fs = require('fs');
const path = require('path');
const db = require('../database');
const LogService = require('./LogService');
const { DATA_DIR } = require('../utils/dataDir');

const BACKUP_DIR = path.join(DATA_DIR, 'uploads', 'backups');
const DEFAULT_KEEP = 14; // how many backups to retain when auto-pruning

function ensureDir() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function timestampForFilename() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

module.exports = {
  /**
   * Create a consistent on-disk backup of the SQLite database.
   * Uses better-sqlite3's built-in `db.backup()` (online/hot backup API),
   * which is safe to run while the bot is live (WAL-aware), unlike a plain
   * `fs.copyFile` which could grab a half-written page mid-write.
   *
   * NOTE: this backs up the *entire* database file, which is shared across
   * all guilds the bot serves (multi-tenant single-file SQLite). There is
   * no per-guild backup/restore — restoring a backup restores every guild's
   * data at once.
   */
  async createBackup(triggeredBy = 'system') {
    ensureDir();

    const filename = `microstore-backup-${timestampForFilename()}.db`;
    const filePath = path.join(BACKUP_DIR, filename);

    await db.backup(filePath);

    const stats = fs.statSync(filePath);

    return {
      filename,
      filePath,
      sizeBytes: stats.size,
      createdAt: stats.mtime,
      triggeredBy,
    };
  },

  /**
   * List existing backup files, most recent first.
   */
  listBackups() {
    ensureDir();
    return fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith('.db'))
      .map((filename) => {
        const filePath = path.join(BACKUP_DIR, filename);
        const stats = fs.statSync(filePath);
        return { filename, filePath, sizeBytes: stats.size, createdAt: stats.mtime };
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  getBackupPath(filename) {
    // Prevent path traversal — only allow plain filenames we generated ourselves.
    const safe = path.basename(filename);
    const filePath = path.join(BACKUP_DIR, safe);
    return fs.existsSync(filePath) ? filePath : null;
  },

  /**
   * Delete backups beyond the most recent `keep` count, to avoid filling
   * up disk space over time on long-running deployments.
   */
  pruneOldBackups(keep = DEFAULT_KEEP) {
    const backups = this.listBackups();
    const toDelete = backups.slice(keep);
    for (const b of toDelete) {
      fs.unlinkSync(b.filePath);
    }
    return toDelete.length;
  },

  /**
   * Start automatic periodic backups (call once at bot startup).
   * Default: every 24 hours, keeping the last 14 backups.
   */
  startScheduledBackup(client, intervalHours = 24, keep = DEFAULT_KEEP) {
    setInterval(async () => {
      try {
        const backup = await this.createBackup('auto-schedule');
        const pruned = this.pruneOldBackups(keep);

        for (const guild of client.guilds.cache.values()) {
          await LogService.log(
            guild,
            'backup',
            `Auto-backup dibuat: ${backup.filename} (${(backup.sizeBytes / 1024).toFixed(1)} KB)` +
              (pruned ? `, ${pruned} backup lama dihapus` : '')
          );
        }
      } catch (err) {
        console.error('BackupService.startScheduledBackup error:', err);
      }
    }, intervalHours * 60 * 60 * 1000);

    console.log(`✅ Auto-backup scheduled (every ${intervalHours}h, keeping last ${keep})`);
  },
};
