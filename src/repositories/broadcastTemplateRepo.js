const db = require('../database');

module.exports = {
  create(guildId, { name, textBefore, imageUrl, textAfter }) {
    const info = db
      .prepare(
        `INSERT INTO broadcast_templates(guild_id, name, text_before, image_url, text_after) VALUES (?,?,?,?,?)`
      )
      .run(guildId, name, textBefore || null, imageUrl || null, textAfter || null);
    return this.getById(info.lastInsertRowid);
  },

  getById(id) {
    return db.prepare('SELECT * FROM broadcast_templates WHERE id = ?').get(id);
  },

  listByGuild(guildId) {
    return db.prepare('SELECT * FROM broadcast_templates WHERE guild_id = ? ORDER BY id DESC').all(guildId);
  },

  update(id, { name, textBefore, imageUrl, textAfter }) {
    db.prepare(
      `UPDATE broadcast_templates SET name = ?, text_before = ?, image_url = ?, text_after = ? WHERE id = ?`
    ).run(name, textBefore || null, imageUrl || null, textAfter || null, id);
    return this.getById(id);
  },

  delete(id) {
    db.prepare('DELETE FROM broadcast_templates WHERE id = ?').run(id);
  },
};
