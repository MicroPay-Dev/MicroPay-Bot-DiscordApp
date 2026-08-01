const db = require('../database');

module.exports = {
  create(guildId, productId, { name, price, deliveryContent }) {
    const info = db
      .prepare(
        `INSERT INTO catalog_variants(guild_id, product_id, name, price, delivery_content) VALUES (?,?,?,?,?)`
      )
      .run(guildId, productId, name, Number(price), deliveryContent || null);
    return this.getById(info.lastInsertRowid);
  },

  getById(id) {
    return db.prepare('SELECT * FROM catalog_variants WHERE id = ?').get(id);
  },

  listByProduct(productId) {
    return db
      .prepare('SELECT * FROM catalog_variants WHERE product_id = ? AND active = 1 ORDER BY id ASC')
      .all(productId);
  },

  // Every purchasable variant across every product in the guild, joined
  // with its parent product's name — used for the "🛒 PILIH PRODUK UNTUK
  // DIBELI" cross-product picker.
  listActiveByGuild(guildId) {
    return db
      .prepare(
        `SELECT v.*, p.name AS product_name
         FROM catalog_variants v
         JOIN catalog_products p ON p.id = v.product_id
         WHERE v.guild_id = ? AND v.active = 1 AND p.active = 1
         ORDER BY p.id ASC, v.id ASC`
      )
      .all(guildId);
  },

  update(id, { name, price, deliveryContent }) {
    db.prepare(`UPDATE catalog_variants SET name = ?, price = ?, delivery_content = ? WHERE id = ?`).run(
      name,
      Number(price),
      deliveryContent || null,
      id
    );
    return this.getById(id);
  },

  disable(id) {
    db.prepare('UPDATE catalog_variants SET active = 0 WHERE id = ?').run(id);
    return this.getById(id);
  },
};
