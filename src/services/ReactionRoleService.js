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

// Converts a mapping back into the string discord.js's message.react()
// expects. Accepts either camelCase (emojiName/emojiId, as used right
// after parseEmojiInput) or snake_case (emoji_name/emoji_id, matching the
// DB row shape) so it works no matter which one is passed in.
function toReactString(mapping) {
  const name = mapping.emojiName ?? mapping.emoji_name;
  const id = mapping.emojiId ?? mapping.emoji_id;
  return id ? `${name}:${id}` : name;
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

    const reactionErrors = [];
    for (const m of parsedMappings) {
      reactionRoleRepo.addMapping(panel.id, { emojiName: m.emojiName, emojiId: m.emojiId, roleId: m.roleId });
      try {
        await message.react(toReactString(m));
      } catch (err) {
        // Surface WHY instead of failing silently — the two most common
        // causes are: (1) the bot lacks "Add Reactions" permission in this
        // channel, or (2) the emoji text wasn't a valid unicode emoji or a
        // real custom emoji from THIS server (custom emoji can only be used
        // by servers they belong to, or servers with emoji sharing enabled).
        reactionErrors.push(`${m.emojiName}: ${err.message}`);
      }
    }

    if (reactionErrors.length) {
      const err = new Error(
        `Panel terkirim, tapi ${reactionErrors.length} emoji gagal ditempel: ${reactionErrors.join('; ')}`
      );
      err.partialSuccess = { panel, message };
      throw err;
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
