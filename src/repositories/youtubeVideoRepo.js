const db = require('../database');

module.exports = {
  add(guildId, youtubeVideoId, title, url, publishedAt) {
    // SQLite can only bind numbers, strings, bigints, buffers, and null - not Date objects.
    const publishedAtStr = publishedAt instanceof Date ? publishedAt.toISOString() : publishedAt;
    db.prepare(
      `INSERT INTO youtube_videos(guild_id, youtube_video_id, title, url, published_at, notified_at)
       VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)`
    ).run(guildId, youtubeVideoId, title, url, publishedAtStr);
  },

  exists(guildId, youtubeVideoId) {
    return db
      .prepare('SELECT 1 FROM youtube_videos WHERE guild_id = ? AND youtube_video_id = ?')
      .get(guildId, youtubeVideoId);
  },

  listByGuild(guildId, limit = 50) {
    return db
      .prepare('SELECT * FROM youtube_videos WHERE guild_id = ? ORDER BY notified_at DESC LIMIT ?')
      .all(guildId, limit);
  },
};
