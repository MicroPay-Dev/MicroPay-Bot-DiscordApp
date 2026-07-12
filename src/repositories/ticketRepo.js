const db = require('../database');

module.exports = {
  create(guildId, userId, channelId, type) {
    const info = db
      .prepare(
        `INSERT INTO tickets(guild_id, user_id, channel_id, type, status)
         VALUES (?,?,?,?,'open')`
      )
      .run(guildId, userId, channelId, type);
    return this.getById(info.lastInsertRowid);
  },

  getById(id) {
    return db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
  },

  getByChannel(channelId) {
    return db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channelId);
  },

  close(channelId) {
    db.prepare(`UPDATE tickets SET status = 'closed', closed_at = CURRENT_TIMESTAMP WHERE channel_id = ?`).run(
      channelId
    );
  },
};
