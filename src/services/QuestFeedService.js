const { EmbedBuilder } = require('discord.js');
const settingsRepo = require('../repositories/settingsRepo');
const questFeedRepo = require('../repositories/questFeedRepo');

const QUESTS_URL = 'https://api.discordquest.com/api/quests';
const COLLECTIBLES_URL = 'https://api.discordquest.com/api/collectibles';
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return res.json();
}

const QUESTS_CDN = 'https://cdn.discordapp.com';

// Quest asset fields (hero, quest_bar_hero, reward.asset, etc.) come back as
// either a full URL, a "quests/<id>/<file>" path, or a bare filename that
// needs the quest ID prefixed onto it manually.
function resolveQuestAssetUrl(questId, assetName) {
  if (typeof assetName !== 'string' || assetName.length === 0) return undefined;
  if (assetName.startsWith('http://') || assetName.startsWith('https://')) return assetName;
  if (assetName.startsWith('quests/')) return `${QUESTS_CDN}/${assetName}`;
  return `${QUESTS_CDN}/quests/${questId}/${assetName}`;
}

// Collectible releases expose several possible banner fields depending on
// context (catalog page, hero carousel, mobile, etc) — use whichever is
// actually present, in order of visual quality/size.
function resolveCollectibleBannerUrl(collectible) {
  const candidates = [
    collectible.featured_block_url,
    collectible.catalog_banner_url,
    collectible.hero_banner_url,
    collectible.mobile_banner_url,
    collectible.mobile_bg_url,
    collectible.logo_url,
    collectible.pdp_bg_url,
  ];
  return candidates.find((c) => typeof c === 'string' && c.length > 0);
}

function buildQuestEmbed(quest) {
  const config = quest.config || {};
  const messages = config.messages || {};
  const app = config.application || {};
  const assets = config.assets || {};
  const rewards = (config.rewards_config?.rewards || [])
    .map((r) => r.messages?.name_with_article || r.messages?.name)
    .filter(Boolean);

  const embed = new EmbedBuilder()
    .setTitle(`🔔 NEW DISCORD QUEST: ${messages.quest_name || 'Unknown Quest'}`)
    .setColor(0x5865f2)
    .addFields(
      { name: '🎮 Game', value: messages.game_title || app.name || '-', inline: false },
      { name: '🎁 Reward', value: rewards.length ? rewards.join(', ') : '-', inline: false }
    );

  // Prefer the full hero banner over the smaller quest-bar hero image.
  const heroUrl = resolveQuestAssetUrl(quest.id, assets.hero) || resolveQuestAssetUrl(quest.id, assets.quest_bar_hero);
  if (heroUrl) embed.setImage(heroUrl);

  if (config.expires_at) {
    embed.addFields({ name: '⏰ Expires', value: new Date(config.expires_at).toUTCString(), inline: false });
  }
  if (app.link) embed.addFields({ name: '📎 Link', value: app.link, inline: false });

  return embed;
}

function buildCollectibleEmbed(collectible) {
  const productNames = (collectible.products || []).map((p) => p.name).filter(Boolean);

  const embed = new EmbedBuilder()
    .setTitle(`🎁 NEW COLLECTIBLE: ${collectible.name || 'Unknown Collectible'}`)
    .setColor(0xeb459e);

  if (collectible.summary && collectible.summary.trim()) {
    embed.setDescription(collectible.summary.trim());
  }

  const bannerUrl = resolveCollectibleBannerUrl(collectible);
  if (bannerUrl) embed.setImage(bannerUrl);

  if (productNames.length) {
    embed.addFields({ name: '🛍️ Items', value: productNames.slice(0, 15).join('\n'), inline: false });
  }

  return embed;
}

/**
 * On the very first run (no rows yet for a given type), we seed the "seen"
 * table with every currently-known item WITHOUT announcing them. Otherwise
 * the first poll would blast hundreds of historical/expired quests into the
 * channel. From then on, only genuinely new items get announced.
 */
function seedIfEmpty(itemType, items, idFn) {
  if (questFeedRepo.countSeen(itemType) > 0) return false;
  for (const item of items) {
    const id = idFn(item);
    if (id) questFeedRepo.markSeen(itemType, id);
  }
  return items.length > 0;
}

async function collectNewQuestEmbeds() {
  const embeds = [];
  try {
    const quests = await fetchJson(QUESTS_URL);
    const seeded = seedIfEmpty('quest', quests, (q) => q.id);
    if (!seeded) {
      for (const quest of quests) {
        const id = quest.id;
        if (!id || questFeedRepo.isSeen('quest', id)) continue;
        questFeedRepo.markSeen('quest', id);
        embeds.push(buildQuestEmbed(quest));
      }
    }
  } catch (err) {
    console.error('❌ QuestFeedService: gagal fetch quests -', err.message);
  }
  return embeds;
}

async function collectNewCollectibleEmbeds() {
  const embeds = [];
  try {
    const collectibles = await fetchJson(COLLECTIBLES_URL);
    const seeded = seedIfEmpty('collectible', collectibles, (c) => c.sku_id || c.store_listing_id);
    if (!seeded) {
      for (const item of collectibles) {
        const id = item.sku_id || item.store_listing_id;
        if (!id || questFeedRepo.isSeen('collectible', id)) continue;
        questFeedRepo.markSeen('collectible', id);
        embeds.push(buildCollectibleEmbed(item));
      }
    }
  } catch (err) {
    console.error('❌ QuestFeedService: gagal fetch collectibles -', err.message);
  }
  return embeds;
}

async function sendToGuilds(client, embeds, isEnabled, getChannelId, getRoleId) {
  if (!embeds.length) return;

  for (const guild of client.guilds.cache.values()) {
    const settings = settingsRepo.get(guild.id);
    if (!settings || !isEnabled(settings)) continue;

    const channelId = getChannelId(settings);
    if (!channelId) continue;

    const channel = guild.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) continue;

    const roleId = getRoleId(settings);
    // Only tag the role on the FIRST message of the batch, not once per
    // chunk of 10 embeds, so people don't get pinged repeatedly.
    let firstChunk = true;

    // Discord allows a max of 10 embeds per message.
    for (let i = 0; i < embeds.length; i += 10) {
      const payload = { embeds: embeds.slice(i, i + 10) };
      if (roleId && firstChunk) payload.content = `<@&${roleId}>`;
      await channel.send(payload).catch(() => {});
      firstChunk = false;
    }
  }
}

async function checkAndAnnounce(client) {
  const questEmbeds = await collectNewQuestEmbeds();
  const collectibleEmbeds = await collectNewCollectibleEmbeds();

  // Quest and Collectible feeds are independently toggled per guild, and can
  // each point to a different channel.
  await sendToGuilds(
    client,
    questEmbeds,
    (s) => !!s.quest_feed_quest_enabled,
    (s) => s.quest_feed_quest_channel,
    (s) => s.quest_feed_quest_role
  );

  await sendToGuilds(
    client,
    collectibleEmbeds,
    (s) => !!s.quest_feed_collectible_enabled,
    (s) => s.quest_feed_collectible_channel,
    (s) => s.quest_feed_collectible_role
  );
}

module.exports = {
  /**
   * Polls api.discordquest.com every hour for new quests/collectibles and
   * auto-announces newly-discovered items. Quest announcements and
   * Collectible announcements are controlled and routed independently per
   * guild (settings.quest_feed_quest_* vs settings.quest_feed_collectible_*).
   */
  startPolling(client) {
    const run = () => checkAndAnnounce(client).catch((err) => console.error('❌ QuestFeedService error:', err));

    // First check shortly after startup, so restarts don't wait a full hour.
    setTimeout(run, 20 * 1000);
    setInterval(run, POLL_INTERVAL_MS);

    console.log('✅ Quest feed scheduler started (every 5 minutes)');
  },
};
