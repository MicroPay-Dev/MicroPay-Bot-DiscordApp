const db = require('../database');

module.exports = {
  create(orderId, guildId, userId) {
    const info = db
      .prepare(`INSERT INTO joki_quest_orders(order_id, guild_id, user_id, status) VALUES (?,?,?,'awaiting_form')`)
      .run(orderId, guildId, userId);
    return this.getById(info.lastInsertRowid);
  },

  getById(id) {
    return db.prepare('SELECT * FROM joki_quest_orders WHERE id = ?').get(id);
  },

  getByOrderId(orderId) {
    return db.prepare('SELECT * FROM joki_quest_orders WHERE order_id = ? ORDER BY id DESC LIMIT 1').get(orderId);
  },

  saveForm(id, { discordEmail, passwordDiscord, backupCode, catatan }) {
    db.prepare(
      `UPDATE joki_quest_orders
       SET discord_email = ?, password_discord = ?, backup_code = ?, catatan = ?,
           status = 'submitted', submitted_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(discordEmail, passwordDiscord, backupCode || null, catatan || null, id);
  },

  /**
   * Wipe sensitive credentials once the joki job is done, so they don't sit
   * in the database indefinitely. Keeps the row (for history) but nulls out
   * email/password/backup code.
   */
  wipeCredentials(id) {
    db.prepare(
      `UPDATE joki_quest_orders
       SET discord_email = NULL, password_discord = NULL, backup_code = NULL,
           status = 'wiped', wiped_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(id);
  },
};
