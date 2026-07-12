const db = require('../database');

module.exports = {
  add(guildId, orderId, userId, stars, comment) {
    const info = db
      .prepare(
        `INSERT INTO ratings(guild_id, order_id, user_id, stars, comment)
         VALUES (?,?,?,?,?)`
      )
      .run(guildId, orderId, userId, stars, comment || null);
    return this.getById(info.lastInsertRowid);
  },

  getById(id) {
    return db.prepare('SELECT * FROM ratings WHERE id = ?').get(id);
  },

  existsByOrder(orderId) {
    return db.prepare('SELECT 1 FROM ratings WHERE order_id = ?').get(orderId);
  },

  listByGuild(guildId, limit = 50) {
    return db
      .prepare('SELECT * FROM ratings WHERE guild_id = ? ORDER BY created_at DESC LIMIT ?')
      .all(guildId, limit);
  },
};
