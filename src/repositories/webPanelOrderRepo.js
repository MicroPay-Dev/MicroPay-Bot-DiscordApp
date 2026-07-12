const db = require('../database');

module.exports = {
  create(orderId, guildId, userId) {
    const info = db
      .prepare(`INSERT INTO web_panel_orders(order_id, guild_id, user_id, status) VALUES (?,?,?,'awaiting_form')`)
      .run(orderId, guildId, userId);
    return this.getById(info.lastInsertRowid);
  },

  getById(id) {
    return db.prepare('SELECT * FROM web_panel_orders WHERE id = ?').get(id);
  },

  getByOrderId(orderId) {
    return db.prepare('SELECT * FROM web_panel_orders WHERE order_id = ? ORDER BY id DESC LIMIT 1').get(orderId);
  },

  saveStep1(id, { websiteName, brandName, domain, description }) {
    db.prepare(
      `UPDATE web_panel_orders SET website_name = ?, brand_name = ?, domain = ?, description = ?, status = 'step1_done' WHERE id = ?`
    ).run(websiteName, brandName, domain, description, id);
  },

  saveStep2(id, { extraFeatures, notes }) {
    db.prepare(
      `UPDATE web_panel_orders SET extra_features = ?, notes = ?, status = 'submitted', submitted_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(extraFeatures || null, notes || null, id);
  },
};
