const db = require('../database');

module.exports = {
  get(guildId) {
    return db.prepare('SELECT * FROM vip_files WHERE guild_id = ?').get(guildId);
  },

  set(guildId, filePath, originalName, uploadedBy) {
    db.prepare(
      `INSERT INTO vip_files(guild_id, file_path, original_name, uploaded_by, updated_at)
       VALUES (?,?,?,?,CURRENT_TIMESTAMP)
       ON CONFLICT(guild_id) DO UPDATE SET
         file_path = excluded.file_path,
         original_name = excluded.original_name,
         uploaded_by = excluded.uploaded_by,
         updated_at = CURRENT_TIMESTAMP`
    ).run(guildId, filePath, originalName, uploadedBy);
    return this.get(guildId);
  },
};
