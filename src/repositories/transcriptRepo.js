const db = require('../database');

module.exports = {
  save(guildId, channelId, channelName, ticketType, userId, content, filePath) {
    const info = db
      .prepare(
        `INSERT INTO transcripts(guild_id, channel_id, channel_name, ticket_type, user_id, content, file_path, exported_at)
         VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`
      )
      .run(guildId, channelId, channelName, ticketType, userId, content, filePath);
    return this.getById(info.lastInsertRowid);
  },

  getById(id) {
    return db.prepare('SELECT * FROM transcripts WHERE id = ?').get(id);
  },

  listByGuild(guildId, limit = 50) {
    return db
      .prepare('SELECT * FROM transcripts WHERE guild_id = ? ORDER BY id DESC LIMIT ?')
      .all(guildId, limit);
  },

  listByChannel(channelId) {
    return db.prepare('SELECT * FROM transcripts WHERE channel_id = ? ORDER BY id DESC LIMIT 1').all(channelId);
  },
};
