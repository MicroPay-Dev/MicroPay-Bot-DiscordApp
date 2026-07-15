const { EmbedBuilder } = require('discord.js');
const settingsRepo = require('../repositories/settingsRepo');
const questFeedRepo = require('../repositories/questFeedRepo');

const QUESTS_URL = 'https://api.discordquest.com/api/quests';
const COLLECTIBLES_URL = 'https://api.discordquest.com/api/collectibles';
const POLL_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return res.json();
}

function buildQuestEmbed(quest) {
  const config = quest.config || {};
  const messages = config.messages || {};
  const app = config.application || {};
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

async function checkAndAnnounce(client) {
  const newEmbeds = [];

  try {
    const quests = await fetchJson(QUESTS_URL);
    const seeded = seedIfEmpty('quest', quests, (q) => q.id);
    if (!seeded) {
      for (const quest of quests) {
        const id = quest.id;
        if (!id || questFeedRepo.isSeen('quest', id)) continue;
        questFeedRepo.markSeen('quest', id);
        newEmbeds.push(buildQuestEmbed(quest));
      }
    }
  } catch (err) {
    console.error('❌ QuestFeedService: gagal fetch quests -', err.message);
  }

  try {
    const collectibles = await fetchJson(COLLECTIBLES_URL);
    const seeded = seedIfEmpty('collectible', collectibles, (c) => c.sku_id || c.store_listing_id);
    if (!seeded) {
      for (const item of collectibles) {
        const id = item.sku_id || item.store_listing_id;
        if (!id || questFeedRepo.isSeen('collectible', id)) continue;
        questFeedRepo.markSeen('collectible', id);
        newEmbeds.push(buildCollectibleEmbed(item));
      }
    }
  } catch (err) {
    console.error('❌ QuestFeedService: gagal fetch collectibles -', err.message);
  }

  if (!newEmbeds.length) return;

  for (const guild of client.guilds.cache.values()) {
    const settings = settingsRepo.get(guild.id);
    if (!settings || !settings.quest_feed_enabled || !settings.quest_feed_channel) continue;

    const channel = guild.channels.cache.get(settings.quest_feed_channel);
    if (!channel || !channel.isTextBased()) continue;

    // Discord allows a max of 10 embeds per message.
    for (let i = 0; i < newEmbeds.length; i += 10) {
      await channel.send({ embeds: newEmbeds.slice(i, i + 10) }).catch(() => {});
    }
  }
}

module.exports = {
  /**
   * Polls api.discordquest.com every hour for new quests/collectibles and
   * auto-announces newly-discovered items to each guild's configured quest
   * feed channel (settings.quest_feed_enabled + quest_feed_channel).
   */
  startPolling(client) {
    const run = () => checkAndAnnounce(client).catch((err) => console.error('❌ QuestFeedService error:', err));

    // First check shortly after startup, so restarts don't wait a full hour.
    setTimeout(run, 20 * 1000);
    setInterval(run, POLL_INTERVAL_MS);

    console.log('✅ Quest feed scheduler started (every 1 hour)');
  },
};
