const { EmbedBuilder } = require('discord.js');
const reactionRoleRepo = require('../repositories/reactionRoleRepo');

// Parses an emoji as typed by an admin in the dashboard: either a raw
// unicode emoji ("⭐") or a Discord custom emoji in its copy-pasted form
// (e.g. "<:star:123456789012345678>" or the animated "<a:star:123...>").
function parseEmojiInput(input) {
  const trimmed = String(input || '').trim();
  const customMatch = /^<a?:(\w+):(\d+)>$/.exec(trimmed);
  if (customMatch) {
    return { emojiName: customMatch[1], emojiId: customMatch[2] };
  }
  return { emojiName: trimmed, emojiId: null };
}

// Converts a stored mapping back into the string discord.js's
// message.react() expects.
function toReactString(mapping) {
  return mapping.emoji_id ? `${mapping.emoji_name}:${mapping.emoji_id}` : mapping.emoji_name;
}

module.exports = {
  parseEmojiInput,

  /**
   * Creates a new reaction-role panel: posts the embed to the target
   * channel, adds every configured emoji as a reaction on it (so members
   * just click an existing reaction, never having to type an emoji
   * themselves), and persists the panel + mappings to the DB.
   *
   * @param {Guild} guild
   * @param {object} options
   * @param {string} options.channelId
   * @param {string} options.title
   * @param {string} options.description
   * @param {string} options.color
   * @param {Array<{ emojiInput: string, roleId: string }>} options.mappings
   */
  async createPanel(guild, { channelId, title, description, color, mappings }) {
    const channel = guild.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) {
      throw new Error('Channel tidak valid.');
    }
    if (!mappings || !mappings.length) {
      throw new Error('Minimal 1 pasangan emoji + role wajib diisi.');
    }

    const parsedMappings = mappings.map((m) => ({
      ...parseEmojiInput(m.emojiInput),
      roleId: m.roleId,
    }));

    const roleListText = parsedMappings
      .map((m) => {
        const emojiDisplay = m.emojiId ? `<:${m.emojiName}:${m.emojiId}>` : m.emojiName;
        return `${emojiDisplay} — <@&${m.roleId}>`;
      })
      .join('\n');

    const embed = new EmbedBuilder()
      .setTitle(title || '🎭 Reaction Role')
      .setDescription(`${description ? description + '\n\n' : ''}${roleListText}`)
      .setColor(color ? parseInt(color.replace('#', ''), 16) : 0x5865f2);

    const message = await channel.send({ embeds: [embed] });

    const panel = reactionRoleRepo.createPanel(guild.id, channelId, { title, description, color });
    reactionRoleRepo.setPanelMessageId(panel.id, message.id);

    for (const m of parsedMappings) {
      reactionRoleRepo.addMapping(panel.id, { emojiName: m.emojiName, emojiId: m.emojiId, roleId: m.roleId });
      await message.react(toReactString(m)).catch(() => {});
    }

    return { panel, message };
  },

  /**
   * Deletes a panel: best-effort removes the Discord message, then always
   * removes the DB rows regardless of whether the message delete succeeded
   * (e.g. channel/message may have already been deleted manually).
   */
  async deletePanel(guild, panelId) {
    const panel = reactionRoleRepo.getPanelById(panelId);
    if (!panel || panel.guild_id !== guild.id) return false;

    const channel = guild.channels.cache.get(panel.channel_id);
    if (channel && panel.message_id) {
      const message = await channel.messages.fetch(panel.message_id).catch(() => null);
      if (message) await message.delete().catch(() => {});
    }

    reactionRoleRepo.deletePanel(panelId);
    return true;
  },
};
