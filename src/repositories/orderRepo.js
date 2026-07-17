const db = require('../database');

module.exports = {
  create(guildId, userId, productId, channelId, quantity = 1) {
    const info = db
      .prepare(
        `INSERT INTO orders(guild_id, user_id, product_id, channel_id, quantity, status)
         VALUES (?,?,?,?,?,'pending')`
      )
      .run(guildId, userId, productId, channelId, quantity);
    return this.getById(info.lastInsertRowid);
  },

  getById(id) {
    return db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  },

  getByChannel(channelId) {
    return db.prepare('SELECT * FROM orders WHERE channel_id = ? ORDER BY id DESC LIMIT 1').get(channelId);
  },

  setStatus(id, status) {
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
  },

  listByGuild(guildId, limit = 50) {
    return db
      .prepare('SELECT * FROM orders WHERE guild_id = ? ORDER BY id DESC LIMIT ?')
      .all(guildId, limit);
  },

  getLatestByUser(guildId, userId) {
    return db
      .prepare('SELECT * FROM orders WHERE guild_id = ? AND user_id = ? ORDER BY id DESC LIMIT 1')
      .get(guildId, userId);
  },
};
