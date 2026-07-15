const db = require('../database');

module.exports = {
  get(guildId) {
    return db.prepare('SELECT * FROM settings WHERE guild_id = ?').get(guildId);
  },

  ensure(guildId) {
    db.prepare('INSERT OR IGNORE INTO settings(guild_id) VALUES (?)').run(guildId);
    return this.get(guildId);
  },

  setWelcome(guildId, channelId, message = null, roleId = null) {
    this.ensure(guildId);
    db.prepare(
      `UPDATE settings SET welcome_enabled = 1, welcome_channel = ?, welcome_message = ?, welcome_role = ? WHERE guild_id = ?`
    ).run(channelId, message, roleId, guildId);
  },

  setWelcomeMessage(guildId, message) {
    this.ensure(guildId);
    db.prepare(`UPDATE settings SET welcome_message = ? WHERE guild_id = ?`).run(message, guildId);
  },

  setWelcomeRole(guildId, roleId) {
    this.ensure(guildId);
    db.prepare(`UPDATE settings SET welcome_role = ? WHERE guild_id = ?`).run(roleId, guildId);
  },

  setWelcomeEmbed(guildId, { enabled, title, color, bannerUrl, thumbnailUrl }) {
    this.ensure(guildId);
    db.prepare(
      `UPDATE settings SET welcome_embed_enabled = ?, welcome_embed_title = ?, welcome_embed_color = ?, welcome_banner_url = ?, welcome_thumbnail_url = ? WHERE guild_id = ?`
    ).run(enabled ? 1 : 0, title || null, color || null, bannerUrl || null, thumbnailUrl || null, guildId);
  },

  setVerify(guildId, channelId, roleId) {
    this.ensure(guildId);
    db.prepare(`UPDATE settings SET verify_enabled = 1, verify_channel = ?, verify_role = ? WHERE guild_id = ?`)
      .run(channelId, roleId, guildId);
  },

  setVerifyEmbed(guildId, { title, description, color, imageUrl }) {
    this.ensure(guildId);
    db.prepare(
      `UPDATE settings SET verify_embed_title = ?, verify_embed_description = ?, verify_embed_color = ?, verify_image_url = ? WHERE guild_id = ?`
    ).run(title || null, description || null, color || null, imageUrl || null, guildId);
  },

  setVerifyMessageId(guildId, messageId) {
    this.ensure(guildId);
    db.prepare(`UPDATE settings SET verify_message_id = ? WHERE guild_id = ?`).run(messageId, guildId);
  },

  setBumpReminder(guildId, { enabled, channelId }) {
    this.ensure(guildId);
    db.prepare(`UPDATE settings SET bump_reminder_enabled = ?, bump_reminder_channel = ? WHERE guild_id = ?`).run(
      enabled ? 1 : 0,
      channelId || null,
      guildId
    );
  },

  setUnverifiedRole(guildId, roleId) {
    this.ensure(guildId);
    db.prepare(`UPDATE settings SET unverified_role = ? WHERE guild_id = ?`).run(roleId || null, guildId);
  },

  setRatingChannel(guildId, channelId) {
    this.ensure(guildId);
    db.prepare(`UPDATE settings SET rating_channel = ? WHERE guild_id = ?`).run(channelId || null, guildId);
  },

  setTestimonialBanner(guildId, url) {
    this.ensure(guildId);
    db.prepare(`UPDATE settings SET testimonial_banner_url = ? WHERE guild_id = ?`).run(url || null, guildId);
  },

  setEmptyCatalogMessage(guildId, message) {
    this.ensure(guildId);
    db.prepare(`UPDATE settings SET empty_catalog_message = ? WHERE guild_id = ?`).run(message || null, guildId);
  },

  setBuyerRole(guildId, roleId) {
    this.ensure(guildId);
    db.prepare(`UPDATE settings SET buyer_role = ? WHERE guild_id = ?`).run(roleId, guildId);
  },

  setAdminRole(guildId, roleId) {
    this.ensure(guildId);
    db.prepare(`UPDATE settings SET admin_role = ? WHERE guild_id = ?`).run(roleId, guildId);
  },

  setLogChannel(guildId, channelId) {
    this.ensure(guildId);
    db.prepare(`UPDATE settings SET log_channel = ? WHERE guild_id = ?`).run(channelId, guildId);
  },

  setQrisImage(guildId, url) {
    this.ensure(guildId);
    db.prepare(`UPDATE settings SET qris_image_url = ? WHERE guild_id = ?`).run(url, guildId);
  },

  setQuestFeed(guildId, { enabled, channelId }) {
    this.ensure(guildId);
    db.prepare(`UPDATE settings SET quest_feed_enabled = ?, quest_feed_channel = ? WHERE guild_id = ?`).run(
      enabled ? 1 : 0,
      channelId || null,
      guildId
    );
  },

  setQuestFeedQuest(guildId, { enabled, channelId }) {
    this.ensure(guildId);
    db.prepare(`UPDATE settings SET quest_feed_quest_enabled = ?, quest_feed_quest_channel = ? WHERE guild_id = ?`).run(
      enabled ? 1 : 0,
      channelId || null,
      guildId
    );
  },

  setQuestFeedCollectible(guildId, { enabled, channelId }) {
    this.ensure(guildId);
    db.prepare(`UPDATE settings SET quest_feed_collectible_enabled = ?, quest_feed_collectible_channel = ? WHERE guild_id = ?`).run(
      enabled ? 1 : 0,
      channelId || null,
      guildId
    );
  },

  setTicketCategories(guildId, { orderCategory, supportCategory }) {
    this.ensure(guildId);
    db.prepare(`UPDATE settings SET order_category = ?, support_category = ? WHERE guild_id = ?`).run(
      orderCategory || null,
      supportCategory || null,
      guildId
    );
  },
};
