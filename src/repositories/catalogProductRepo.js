const db = require('../database');

module.exports = {
  create(guildId, { name, description }) {
    const info = db
      .prepare(`INSERT INTO catalog_products(guild_id, name, description) VALUES (?,?,?)`)
      .run(guildId, name, description || null);
    return this.getById(info.lastInsertRowid);
  },

  getById(id) {
    return db.prepare('SELECT * FROM catalog_products WHERE id = ?').get(id);
  },

  listActive(guildId) {
    return db
      .prepare('SELECT * FROM catalog_products WHERE guild_id = ? AND active = 1 ORDER BY id ASC')
      .all(guildId);
  },

  listAll(guildId) {
    return db.prepare('SELECT * FROM catalog_products WHERE guild_id = ? ORDER BY id ASC').all(guildId);
  },

  update(id, { name, description }) {
    db.prepare(`UPDATE catalog_products SET name = ?, description = ? WHERE id = ?`).run(
      name,
      description || null,
      id
    );
    return this.getById(id);
  },

  disable(id) {
    db.prepare('UPDATE catalog_products SET active = 0 WHERE id = ?').run(id);
    return this.getById(id);
  },
};
