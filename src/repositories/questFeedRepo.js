const db = require('../database');

module.exports = {
  isSeen(itemType, itemId) {
    const row = db.prepare('SELECT 1 FROM quest_feed_seen WHERE item_type = ? AND item_id = ?').get(itemType, itemId);
    return !!row;
  },

  markSeen(itemType, itemId) {
    db.prepare('INSERT OR IGNORE INTO quest_feed_seen(item_type, item_id) VALUES (?, ?)').run(itemType, itemId);
  },

  countSeen(itemType) {
    const row = db.prepare('SELECT COUNT(*) as count FROM quest_feed_seen WHERE item_type = ?').get(itemType);
    return row.count;
  },
};
