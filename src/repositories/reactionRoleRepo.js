const db = require('../database');

module.exports = {
  createPanel(guildId, channelId, { title, description, color }) {
    const info = db
      .prepare(
        `INSERT INTO reaction_role_panels(guild_id, channel_id, title, description, color) VALUES (?,?,?,?,?)`
      )
      .run(guildId, channelId, title || null, description || null, color || null);
    return this.getPanelById(info.lastInsertRowid);
  },

  setPanelMessageId(panelId, messageId) {
    db.prepare(`UPDATE reaction_role_panels SET message_id = ? WHERE id = ?`).run(messageId, panelId);
  },

  getPanelById(id) {
    return db.prepare('SELECT * FROM reaction_role_panels WHERE id = ?').get(id);
  },

  listPanelsByGuild(guildId) {
    const panels = db
      .prepare('SELECT * FROM reaction_role_panels WHERE guild_id = ? ORDER BY id DESC')
      .all(guildId);
    return panels.map((panel) => ({
      ...panel,
      mappings: db.prepare('SELECT * FROM reaction_role_mappings WHERE panel_id = ?').all(panel.id),
    }));
  },

  addMapping(panelId, { emojiName, emojiId, roleId }) {
    db.prepare(
      `INSERT INTO reaction_role_mappings(panel_id, emoji_name, emoji_id, role_id) VALUES (?,?,?,?)`
    ).run(panelId, emojiName, emojiId || null, roleId);
  },

  getMappingsByPanelId(panelId) {
    return db.prepare('SELECT * FROM reaction_role_mappings WHERE panel_id = ?').all(panelId);
  },

  // Looks up the role for a given message + emoji combo. Custom emoji are
  // matched by ID (stable even if renamed); unicode emoji are matched by
  // their literal character since they have no ID.
  findMapping(messageId, emojiName, emojiId) {
    const panel = db.prepare('SELECT id FROM reaction_role_panels WHERE message_id = ?').get(messageId);
    if (!panel) return null;

    if (emojiId) {
      return db
        .prepare('SELECT * FROM reaction_role_mappings WHERE panel_id = ? AND emoji_id = ?')
        .get(panel.id, emojiId);
    }
    return db
      .prepare('SELECT * FROM reaction_role_mappings WHERE panel_id = ? AND emoji_name = ? AND emoji_id IS NULL')
      .get(panel.id, emojiName);
  },

  deletePanel(panelId) {
    db.prepare('DELETE FROM reaction_role_mappings WHERE panel_id = ?').run(panelId);
    db.prepare('DELETE FROM reaction_role_panels WHERE id = ?').run(panelId);
  },
};
