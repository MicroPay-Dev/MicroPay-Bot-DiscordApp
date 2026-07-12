const db = require('../database');

module.exports = {
  create(guildId, orderId, userId, amount) {
    const info = db
      .prepare(
        `INSERT INTO payments(guild_id, order_id, user_id, amount, status)
         VALUES (?,?,?,?,'pending')`
      )
      .run(guildId, orderId, userId, amount);
    return this.getById(info.lastInsertRowid);
  },

  getById(id) {
    return db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
  },

  getLatestByOrder(orderId) {
    return db
      .prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1')
      .get(orderId);
  },

  attachProof(id, proofUrl) {
    db.prepare(`UPDATE payments SET proof_url = ?, status = 'proof_uploaded' WHERE id = ?`).run(
      proofUrl,
      id
    );
  },

  approve(id, reviewerId) {
    db.prepare(
      `UPDATE payments SET status = 'approved', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(reviewerId, id);
  },

  reject(id, reviewerId) {
    db.prepare(
      `UPDATE payments SET status = 'rejected', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(reviewerId, id);
  },

  listByGuild(guildId, limit = 50) {
    return db
      .prepare('SELECT * FROM payments WHERE guild_id = ? ORDER BY id DESC LIMIT ?')
      .all(guildId, limit);
  },
};
