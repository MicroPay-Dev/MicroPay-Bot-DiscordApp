const express = require('express');
const fs = require('fs');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const settingsRepo = require('../repositories/settingsRepo');
const { postVerifyPanel } = require('../bot/utils/verifyPanel');
const productRepo = require('../repositories/productRepo');
const orderRepo = require('../repositories/orderRepo');
const paymentRepo = require('../repositories/paymentRepo');
const logRepo = require('../repositories/logRepo');
const transcriptRepo = require('../repositories/transcriptRepo');
const youtubeChannelRepo = require('../repositories/youtubeChannelRepo');
const youtubeVideoRepo = require('../repositories/youtubeVideoRepo');
const AnalyticsService = require('../services/AnalyticsService');
const BackupService = require('../services/BackupService');
const ProductService = require('../services/ProductService');
const { isDeveloper } = require('../utils/developer');
const { REST, Routes } = require('discord.js');

const router = express.Router();

// The Discord bot client is injected from server.js after login, so this
// module can read live guild data (channel/role lists) for the Settings UI.
let discordClient = null;
function setClient(client) {
  discordClient = client;
}

// Auth: requires a valid Discord OAuth2 session (see src/dashboard/session.js
// and src/dashboard/authRoutes.js). Replaces the old DISCORD_TOKEN bearer
// check from Phase 1/MVP now that Phase 2 login is in place.
function authMiddleware(req, res, next) {
  if (!req.session) {
    return res.status(401).json({ error: 'Belum login. Silakan login lewat Discord.' });
  }
  next();
}

// Gate for developer-only routes. Full database backups span EVERY guild's
// data (orders, payments, and even plaintext Discord credentials stored for
// joki quest orders) — never safe to expose to arbitrary public dashboard
// users once the bot is installed on other people's servers.
function requireDeveloper(req, res, next) {
  if (!isDeveloper(req.session?.discordUser?.id)) {
    return res.status(403).json({ error: 'Fitur ini khusus untuk developer bot.' });
  }
  next();
}

// Image/banner URL fields across every feature (welcome embed, verify embed,
// QRIS, testimonials, catalog, broadcast, quest update, etc). Only the
// developer may set these — public server admins get everything else, but
// custom image links are developer-only. Silently stripped (not rejected)
// so the rest of a form submission still saves normally.
const DEVELOPER_ONLY_FIELDS = [
  'welcome_banner_url',
  'welcome_thumbnail_url',
  'verify_image_url',
  'qris_image_url',
  'testimonial_banner_url',
  'banner_url',
  'embed_image_url',
  'attachment_url',
  'image_url',
];

function stripDeveloperOnlyFields(req, res, next) {
  if (!isDeveloper(req.session?.discordUser?.id) && req.body) {
    for (const field of DEVELOPER_ONLY_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        delete req.body[field];
      }
    }
  }
  next();
}

router.use(authMiddleware);
router.use(express.json());
router.use(stripDeveloperOnlyFields);

// Runs for every route with a :guildId param — confirms the logged-in user
// actually has Manage Server (or Administrator) permission in that guild,
// so one dashboard user can never read/edit another guild's data.
router.param('guildId', (req, res, next, guildId) => {
  const access = req.session.guilds?.find((g) => g.id === guildId && g.canManage);
  if (!access) {
    return res.status(403).json({ error: 'Anda tidak punya akses admin di server ini.' });
  }
  next();
});

// --- GUILD META (channels & roles, for Settings UI dropdowns) ---

router.get('/guilds/:guildId/meta', (req, res) => {
  const guild = discordClient?.guilds.cache.get(req.params.guildId);
  if (!guild) {
    return res.status(404).json({ error: 'Bot belum bergabung ke server ini.' });
  }

  const channels = guild.channels.cache
    .filter((c) => c.isTextBased() && !c.isThread())
    .map((c) => ({ id: c.id, name: c.name, type: c.type }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const roles = guild.roles.cache
    .filter((r) => r.id !== guild.id) // exclude @everyone
    .map((r) => ({ id: r.id, name: r.name, color: r.hexColor }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const categories = guild.channels.cache
    .filter((c) => c.type === ChannelType.GuildCategory)
    .map((c) => ({ id: c.id, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  res.json({ guildName: guild.name, guildIcon: guild.iconURL(), channels, roles, categories });
});

// --- PRODUCT CATALOG (post all active products as embed to a channel) ---

router.post('/guilds/:guildId/catalog', async (req, res) => {
  const guild = discordClient?.guilds.cache.get(req.params.guildId);
  if (!guild) return res.status(404).json({ error: 'Bot belum bergabung ke server ini.' });

  const { channel_id, title, description, color, banner_url, show_products } = req.body;
  if (!channel_id) return res.status(400).json({ error: 'Channel wajib dipilih.' });

  const channel = guild.channels.cache.get(channel_id);
  if (!channel || !channel.isTextBased()) return res.status(400).json({ error: 'Channel tidak valid.' });

  const embed = new EmbedBuilder()
    .setTitle(title || '🛒 Katalog Produk MICROSTORE')
    .setDescription(description || 'Klik tombol di bawah untuk membuat ticket order dan melihat produk yang tersedia.')
    .setColor(color ? parseInt(color.replace('#', ''), 16) : 0x5865f2);

  // Product fields are optional - only add them if explicitly requested and products exist.
  if (show_products) {
    const products = productRepo.listActive(req.params.guildId);
    products.forEach((p) => {
      const typeLabel = {
        general: '📦 General',
        joki_quest: '🎮 Joki Quest',
        auto_quest_vip: '⚡ Auto Quest VIP',
        web_panel: '🌐 Web Panel',
      }[p.type] || p.type;

      embed.addFields({
        name: `${p.name}`,
        value: `💰 **Rp${p.price.toLocaleString('id-ID')}**\n${typeLabel}${p.description ? `\n${p.description}` : ''}`,
        inline: true,
      });
    });
  }

  if (banner_url) embed.setImage(banner_url);
  embed.setTimestamp().setFooter({ text: 'MICROSTORE — Order sekarang!' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('order_panel_create_ticket')
      .setLabel('Buat Pesanan')
      .setEmoji('🛒')
      .setStyle(ButtonStyle.Primary)
  );

  try {
    await channel.send({ embeds: [embed], components: [row] });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengirim katalog: ' + err.message });
  }
});

// --- BROADCAST (send message/embed/file/link to any channel) ---

router.post('/guilds/:guildId/broadcast', async (req, res) => {
  const guild = discordClient?.guilds.cache.get(req.params.guildId);
  if (!guild) {
    return res.status(404).json({ error: 'Bot belum bergabung ke server ini.' });
  }

  const { channel_id, content, embed_title, embed_description, embed_color, embed_image_url, attachment_url } =
    req.body;

  const channel = guild.channels.cache.get(channel_id);
  if (!channel || !channel.isTextBased()) {
    return res.status(400).json({ error: 'Channel tidak valid.' });
  }

  const hasEmbed = embed_title || embed_description || embed_image_url;
  if (!content && !hasEmbed && !attachment_url) {
    return res.status(400).json({ error: 'Isi minimal salah satu: pesan teks, embed, atau file/link.' });
  }

  const payload = {};
  if (content) payload.content = content;

  if (hasEmbed) {
    const embed = new EmbedBuilder().setColor(embed_color ? parseInt(embed_color.replace('#', ''), 16) : 0x5865f2);
    if (embed_title) embed.setTitle(embed_title);
    if (embed_description) embed.setDescription(embed_description);
    if (embed_image_url) embed.setImage(embed_image_url);
    payload.embeds = [embed];
  }

  if (attachment_url) payload.files = [attachment_url];

  try {
    const sent = await channel.send(payload);
    res.json({ success: true, messageId: sent.id, channelId: channel.id });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengirim pesan: ' + err.message });
  }
});

// --- QUEST UPDATE (manual announcement of a new quest, posted as a formatted embed) ---

router.post('/guilds/:guildId/quest-update', async (req, res) => {
  const guild = discordClient?.guilds.cache.get(req.params.guildId);
  if (!guild) {
    return res.status(404).json({ error: 'Bot belum bergabung ke server ini.' });
  }

  const { channel_id, game, reward, expires, link, image_url } = req.body;

  if (!channel_id || !game || !reward) {
    return res.status(400).json({ error: 'Channel, Game, dan Reward wajib diisi.' });
  }

  const channel = guild.channels.cache.get(channel_id);
  if (!channel || !channel.isTextBased()) {
    return res.status(400).json({ error: 'Channel tidak valid.' });
  }

  const embed = new EmbedBuilder()
    .setTitle('🔔 NEW DISCORD QUEST')
    .setColor(0x5865f2)
    .addFields(
      { name: '🎮 Game', value: game, inline: false },
      { name: '🎁 Reward', value: reward, inline: false },
      { name: '⏰ Expires', value: expires || 'Tidak ditentukan', inline: false }
    );

  if (link) embed.addFields({ name: '📎 Open Quest', value: link, inline: false });
  if (image_url) embed.setImage(image_url);

  try {
    const sent = await channel.send({ embeds: [embed] });
    res.json({ success: true, messageId: sent.id, channelId: channel.id });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengirim quest update: ' + err.message });
  }
});

// --- SETTINGS API ---

router.get('/guilds/:guildId/settings', (req, res) => {
  const settings = settingsRepo.get(req.params.guildId) || settingsRepo.ensure(req.params.guildId);
  res.json(settings || {});
});

router.put('/guilds/:guildId/settings', (req, res) => {
  const { guildId } = req.params;
  const {
    welcome_message,
    welcome_role,
    welcome_channel,
    welcome_embed_enabled,
    welcome_embed_title,
    welcome_embed_color,
    welcome_banner_url,
    welcome_thumbnail_url,
    verify_channel,
    verify_role,
    verify_embed_title,
    verify_embed_description,
    verify_embed_color,
    verify_image_url,
    buyer_role,
    admin_role,
    log_channel,
    qris_image_url,
    bump_reminder_enabled,
    bump_reminder_channel,
    unverified_role,
    rating_channel,
    testimonial_banner_url,
    empty_catalog_message,
    quest_feed_quest_enabled,
    quest_feed_quest_channel,
    quest_feed_collectible_enabled,
    quest_feed_collectible_channel,
    order_category,
    support_category,
  } = req.body;

  settingsRepo.ensure(guildId);
  if (order_category !== undefined || support_category !== undefined) {
    const current = settingsRepo.get(guildId);
    settingsRepo.setTicketCategories(guildId, {
      orderCategory: order_category !== undefined ? order_category : current.order_category,
      supportCategory: support_category !== undefined ? support_category : current.support_category,
    });
  }
  if (quest_feed_quest_enabled !== undefined || quest_feed_quest_channel !== undefined) {
    const current = settingsRepo.get(guildId);
    settingsRepo.setQuestFeedQuest(guildId, {
      enabled: quest_feed_quest_enabled !== undefined ? !!quest_feed_quest_enabled : !!current.quest_feed_quest_enabled,
      channelId: quest_feed_quest_channel !== undefined ? quest_feed_quest_channel : current.quest_feed_quest_channel,
    });
  }
  if (quest_feed_collectible_enabled !== undefined || quest_feed_collectible_channel !== undefined) {
    const current = settingsRepo.get(guildId);
    settingsRepo.setQuestFeedCollectible(guildId, {
      enabled: quest_feed_collectible_enabled !== undefined ? !!quest_feed_collectible_enabled : !!current.quest_feed_collectible_enabled,
      channelId: quest_feed_collectible_channel !== undefined ? quest_feed_collectible_channel : current.quest_feed_collectible_channel,
    });
  }
  if (welcome_message !== undefined) settingsRepo.setWelcomeMessage(guildId, welcome_message);
  if (welcome_role !== undefined) settingsRepo.setWelcomeRole(guildId, welcome_role);
  if (welcome_channel !== undefined || welcome_message !== undefined || welcome_role !== undefined) {
    const current = settingsRepo.get(guildId);
    settingsRepo.setWelcome(
      guildId,
      welcome_channel !== undefined ? welcome_channel : current.welcome_channel,
      welcome_message !== undefined ? welcome_message : current.welcome_message,
      welcome_role !== undefined ? welcome_role : current.welcome_role
    );
  }
  if (
    welcome_embed_enabled !== undefined ||
    welcome_embed_title !== undefined ||
    welcome_embed_color !== undefined ||
    welcome_banner_url !== undefined ||
    welcome_thumbnail_url !== undefined
  ) {
    const current = settingsRepo.get(guildId);
    settingsRepo.setWelcomeEmbed(guildId, {
      enabled: welcome_embed_enabled !== undefined ? !!welcome_embed_enabled : !!current.welcome_embed_enabled,
      title: welcome_embed_title !== undefined ? welcome_embed_title : current.welcome_embed_title,
      color: welcome_embed_color !== undefined ? welcome_embed_color : current.welcome_embed_color,
      bannerUrl: welcome_banner_url !== undefined ? welcome_banner_url : current.welcome_banner_url,
      thumbnailUrl: welcome_thumbnail_url !== undefined ? welcome_thumbnail_url : current.welcome_thumbnail_url,
    });
  }
  if (verify_channel !== undefined && verify_role !== undefined) settingsRepo.setVerify(guildId, verify_channel, verify_role);
  if (
    verify_embed_title !== undefined ||
    verify_embed_description !== undefined ||
    verify_embed_color !== undefined ||
    verify_image_url !== undefined
  ) {
    const current = settingsRepo.get(guildId);
    settingsRepo.setVerifyEmbed(guildId, {
      title: verify_embed_title !== undefined ? verify_embed_title : current.verify_embed_title,
      description: verify_embed_description !== undefined ? verify_embed_description : current.verify_embed_description,
      color: verify_embed_color !== undefined ? verify_embed_color : current.verify_embed_color,
      imageUrl: verify_image_url !== undefined ? verify_image_url : current.verify_image_url,
    });
  }
  if (buyer_role !== undefined) settingsRepo.setBuyerRole(guildId, buyer_role);
  if (admin_role !== undefined) settingsRepo.setAdminRole(guildId, admin_role);
  if (log_channel !== undefined) settingsRepo.setLogChannel(guildId, log_channel);
  if (qris_image_url !== undefined) settingsRepo.setQrisImage(guildId, qris_image_url);
  if (bump_reminder_enabled !== undefined || bump_reminder_channel !== undefined) {
    const current = settingsRepo.get(guildId);
    settingsRepo.setBumpReminder(guildId, {
      enabled: bump_reminder_enabled !== undefined ? !!bump_reminder_enabled : !!current.bump_reminder_enabled,
      channelId: bump_reminder_channel !== undefined ? bump_reminder_channel : current.bump_reminder_channel,
    });
  }
  if (unverified_role !== undefined) settingsRepo.setUnverifiedRole(guildId, unverified_role);
  if (rating_channel !== undefined) settingsRepo.setRatingChannel(guildId, rating_channel);
  if (testimonial_banner_url !== undefined) settingsRepo.setTestimonialBanner(guildId, testimonial_banner_url);
  if (empty_catalog_message !== undefined) settingsRepo.setEmptyCatalogMessage(guildId, empty_catalog_message);

  res.json(settingsRepo.get(guildId));
});

// Re-post the verification panel using the currently saved embed settings.
// Useful after editing the title/description/color/image from the dashboard.
router.post('/guilds/:guildId/verify-panel/repost', async (req, res) => {
  const guild = discordClient?.guilds.cache.get(req.params.guildId);
  if (!guild) {
    return res.status(404).json({ error: 'Bot belum bergabung ke server ini.' });
  }

  const settings = settingsRepo.get(req.params.guildId);
  if (!settings || !settings.verify_channel || !settings.verify_role) {
    return res.status(400).json({ error: 'Setup verifikasi (channel & role) belum dikonfigurasi. Jalankan /setup-verify dulu.' });
  }

  try {
    // Try to delete the old panel message first to avoid duplicates piling up in the channel.
    if (settings.verify_message_id) {
      const channel = guild.channels.cache.get(settings.verify_channel);
      const oldMessage = channel ? await channel.messages.fetch(settings.verify_message_id).catch(() => null) : null;
      if (oldMessage) await oldMessage.delete().catch(() => {});
    }

    const sent = await postVerifyPanel(guild, settings);
    if (!sent) {
      return res.status(400).json({ error: 'Channel verifikasi tidak ditemukan.' });
    }

    settingsRepo.setVerifyMessageId(req.params.guildId, sent.id);
    res.json({ success: true, messageId: sent.id });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengirim ulang panel: ' + err.message });
  }
});

// Send a preview/test of the welcome message (using the logged-in admin as the "new member")
// so admins can see exactly what real new members will receive, without waiting for someone to join.
router.post('/guilds/:guildId/welcome-panel/send-test', async (req, res) => {
  const guild = discordClient?.guilds.cache.get(req.params.guildId);
  if (!guild) {
    return res.status(404).json({ error: 'Bot belum bergabung ke server ini.' });
  }

  const settings = settingsRepo.get(req.params.guildId);
  if (!settings || !settings.welcome_channel) {
    return res.status(400).json({ error: 'Channel welcome belum dipilih. Pilih channel dulu lalu Save.' });
  }

  const channel = guild.channels.cache.get(settings.welcome_channel);
  if (!channel || !channel.isTextBased()) {
    return res.status(400).json({ error: 'Channel welcome tidak ditemukan.' });
  }

  const adminUserId = req.session?.discordUser?.id;
  let member = null;
  if (adminUserId) {
    member = await guild.members.fetch(adminUserId).catch(() => null);
  }

  const message = settings.welcome_message || `👋 Selamat datang {user} di {server}`;
  const mention = member ? `<@${member.id}>` : '@NewMember';
  const formatted = message.replace(/{user}/g, mention).replace(/{server}/g, guild.name);

  try {
    if (settings.welcome_embed_enabled) {
      const embed = new EmbedBuilder()
        .setColor(settings.welcome_embed_color ? parseInt(settings.welcome_embed_color.replace('#', ''), 16) : 0x5865f2)
        .setTitle(settings.welcome_embed_title || `👋 Selamat Datang!`)
        .setDescription(formatted)
        .setThumbnail(settings.welcome_thumbnail_url || member?.user.displayAvatarURL() || null);

      if (settings.welcome_banner_url) embed.setImage(settings.welcome_banner_url);

      await channel.send({ embeds: [embed] });
    } else {
      await channel.send({ content: formatted });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengirim preview: ' + err.message });
  }
});

// --- PRODUCTS API ---

router.get('/guilds/:guildId/products', (req, res) => {
  const products = productRepo.listActive(req.params.guildId);
  res.json(products);
});

router.post('/guilds/:guildId/products', (req, res) => {
  const { name, price, type, description, delivery_content } = req.body;
  if (!name || !price) {
    return res.status(400).json({ error: 'name and price required' });
  }

  const product = productRepo.add(req.params.guildId, {
    name,
    price: Number(price),
    type: type || 'general',
    description: description || '',
    deliveryContent: delivery_content || '',
  });
  res.json(product);
});

router.delete('/guilds/:guildId/products/:productId', (req, res) => {
  const product = ProductService.disableProduct(req.params.guildId, Number(req.params.productId));
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json({ success: true, deleted: product });
});

// --- ORDERS API ---

router.get('/guilds/:guildId/orders', (req, res) => {
  const orders = orderRepo.listByGuild(req.params.guildId);
  res.json(orders);
});

// --- PAYMENTS API ---

router.get('/guilds/:guildId/payments', (req, res) => {
  const payments = paymentRepo.listByGuild(req.params.guildId);
  res.json(payments);
});

// --- LOGS API ---

router.get('/guilds/:guildId/logs', (req, res) => {
  const { type } = req.query; // ?type=payment&type=ticket&type=verification&type=transcript
  const logs = logRepo.getByGuild(req.params.guildId, type);
  res.json(logs);
});

// --- TRANSCRIPTS API ---

router.get('/guilds/:guildId/transcripts', (req, res) => {
  const transcripts = transcriptRepo.listByGuild(req.params.guildId);
  res.json(transcripts);
});

router.get('/transcripts/:transcriptId/download', (req, res) => {
  const transcript = transcriptRepo.getById(req.params.transcriptId);
  if (!transcript || !fs.existsSync(transcript.file_path)) {
    return res.status(404).json({ error: 'Transcript not found' });
  }

  res.setHeader('Content-Disposition', `attachment; filename="transcript-${transcript.channel_name}.txt"`);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  fs.createReadStream(transcript.file_path).pipe(res);
});

// --- YOUTUBE API ---

router.get('/guilds/:guildId/youtube/channels', (req, res) => {
  const channels = youtubeChannelRepo.listByGuild(req.params.guildId);
  res.json(channels);
});

router.post('/guilds/:guildId/youtube/channels', (req, res) => {
  const { discord_channel_id, youtube_channel_id, youtube_channel_name } = req.body;
  if (!discord_channel_id || !youtube_channel_id || !youtube_channel_name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const channel = youtubeChannelRepo.add(req.params.guildId, discord_channel_id, youtube_channel_id, youtube_channel_name);
  res.json(channel);
});

router.delete('/youtube/channels/:channelId', (req, res) => {
  youtubeChannelRepo.remove(req.params.channelId);
  res.json({ success: true });
});

router.get('/guilds/:guildId/youtube/videos', (req, res) => {
  const videos = youtubeVideoRepo.listByGuild(req.params.guildId);
  res.json(videos);
});

// --- ANALYTICS API (Phase 3) ---

router.get('/guilds/:guildId/analytics', (req, res) => {
  const summary = AnalyticsService.getSummary(req.params.guildId);
  res.json(summary);
});

router.get('/guilds/:guildId/analytics/timeline', (req, res) => {
  const days = req.query.days ? Number(req.query.days) : 30;
  const timeline = AnalyticsService.getRevenueTimeline(req.params.guildId, days);
  res.json(timeline);
});

router.get('/guilds/:guildId/analytics/recent-sales', (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  const sales = AnalyticsService.getRecentSales(req.params.guildId, limit);
  res.json(sales);
});

// --- BACKUP API (Phase 3) ---
// NOTE: backups cover the entire shared database file (all guilds), so
// these routes are intentionally not guild-scoped.

router.get('/backups', requireDeveloper, (req, res) => {
  const backups = BackupService.listBackups();
  res.json(backups);
});

router.post('/backups', requireDeveloper, async (req, res) => {
  try {
    const backup = await BackupService.createBackup(req.body?.triggeredBy || 'dashboard');
    BackupService.pruneOldBackups();
    res.json(backup);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/backups/:filename/download', requireDeveloper, (req, res) => {
  const filePath = BackupService.getBackupPath(req.params.filename);
  if (!filePath) {
    return res.status(404).json({ error: 'Backup not found' });
  }

  res.setHeader('Content-Disposition', `attachment; filename="${req.params.filename}"`);
  res.setHeader('Content-Type', 'application/octet-stream');
  fs.createReadStream(filePath).pipe(res);
});

// --- BOT PROFILE (developer-only, global — not guild-scoped) ---
// Lets the developer change the bot's own Discord identity: username,
// avatar, profile banner, and application "About Me" description.

router.get('/bot-profile', requireDeveloper, async (req, res) => {
  if (!discordClient?.user) return res.status(503).json({ error: 'Bot belum online.' });
  try {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    const app = await rest.get(Routes.currentApplication());
    res.json({
      username: discordClient.user.username,
      avatar_url: discordClient.user.displayAvatarURL({ size: 256 }),
      banner_url: discordClient.user.bannerURL({ size: 512 }) || null,
      description: app.description || '',
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat profil bot: ' + err.message });
  }
});

router.put('/bot-profile', requireDeveloper, async (req, res) => {
  if (!discordClient?.user) return res.status(503).json({ error: 'Bot belum online.' });
  const { username, avatar_url, banner_url, description } = req.body;

  try {
    if (username) await discordClient.user.setUsername(username);
    if (avatar_url) await discordClient.user.setAvatar(avatar_url);
    if (banner_url) await discordClient.user.setBanner(banner_url);
    if (description !== undefined) {
      const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
      await rest.patch(Routes.currentApplication(), { body: { description } });
    }
    res.json({ success: true });
  } catch (err) {
    // Discord heavily rate-limits username changes (roughly 2x/hour) — surface
    // the real Discord error message so the developer knows why it failed.
    res.status(500).json({ error: 'Gagal update profil bot: ' + err.message });
  }
});

module.exports = router;
module.exports.setClient = setClient;
