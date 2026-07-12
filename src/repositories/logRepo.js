const db = require('../database');

module.exports = {
  add(guildId, type, message) {
    db.prepare('INSERT INTO logs(guild_id, type, message) VALUES (?,?,?)').run(guildId, type, message);
  },

  recent(guildId, limit = 50) {
    return db
      .prepare('SELECT * FROM logs WHERE guild_id = ? ORDER BY id DESC LIMIT ?')
      .all(guildId, limit);
  },

  getByGuild(guildId, type = null, limit = 100) {
    if (type) {
      return db
        .prepare('SELECT * FROM logs WHERE guild_id = ? AND type = ? ORDER BY id DESC LIMIT ?')
        .all(guildId, type, limit);
    }
    return db
      .prepare('SELECT * FROM logs WHERE guild_id = ? ORDER BY id DESC LIMIT ?')
      .all(guildId, limit);
  },
};
