const db = require('../database');

module.exports = {
  add(guildId, discordChannelId, youtubeChannelId, youtubeChannelName) {
    const info = db
      .prepare(
        `INSERT INTO youtube_channels(guild_id, channel_id, youtube_channel_id, youtube_channel_name, last_check)
         VALUES (?,?,?,?,CURRENT_TIMESTAMP)`
      )
      .run(guildId, discordChannelId, youtubeChannelId, youtubeChannelName);
    return this.getById(info.lastInsertRowid);
  },

  getById(id) {
    return db.prepare('SELECT * FROM youtube_channels WHERE id = ?').get(id);
  },

  listByGuild(guildId) {
    return db.prepare('SELECT * FROM youtube_channels WHERE guild_id = ? ORDER BY id ASC').all(guildId);
  },

  remove(id) {
    db.prepare('DELETE FROM youtube_channels WHERE id = ?').run(id);
  },

  updateLastCheck(id) {
    db.prepare('UPDATE youtube_channels SET last_check = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  },
};
