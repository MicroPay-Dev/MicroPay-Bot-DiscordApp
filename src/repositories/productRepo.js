const db = require('../database');

module.exports = {
  add(guildId, { name, type, price, description, deliveryContent }) {
    const info = db
      .prepare(
        `INSERT INTO products(guild_id, name, type, price, description, delivery_content, status)
         VALUES (?,?,?,?,?,?,'active')`
      )
      .run(guildId, name, type || 'general', price, description || null, deliveryContent || null);
    return this.getById(info.lastInsertRowid);
  },

  listActive(guildId) {
    return db
      .prepare(`SELECT * FROM products WHERE guild_id = ? AND status = 'active' ORDER BY id ASC`)
      .all(guildId);
  },

  getById(id) {
    return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  },

  disable(id) {
    db.prepare(`UPDATE products SET status = 'disabled' WHERE id = ?`).run(id);
  },
};
