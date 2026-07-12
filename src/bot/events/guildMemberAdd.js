const { EmbedBuilder } = require('discord.js');
const settingsRepo = require('../../repositories/settingsRepo');

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(member) {
    const settings = settingsRepo.get(member.guild.id);
    if (!settings || !settings.welcome_enabled || !settings.welcome_channel) return;

    const channel = member.guild.channels.cache.get(settings.welcome_channel);
    if (channel) {
      // Use custom message if set, otherwise fallback to default
      const message = settings.welcome_message || `👋 Selamat datang {user} di {server}`;
      const formatted = message.replace('{user}', `<@${member.id}>`).replace('{server}', member.guild.name);

      if (settings.welcome_embed_enabled) {
        const embed = new EmbedBuilder()
          .setColor(settings.welcome_embed_color ? parseInt(settings.welcome_embed_color.replace('#', ''), 16) : 0x5865f2)
          .setTitle(settings.welcome_embed_title || `👋 Selamat Datang!`)
          .setDescription(formatted)
          .setThumbnail(settings.welcome_thumbnail_url || member.user.displayAvatarURL());

        if (settings.welcome_banner_url) embed.setImage(settings.welcome_banner_url);

        await channel.send({ embeds: [embed] }).catch(() => {});
      } else {
        await channel.send(formatted).catch(() => {});
      }

      // Give welcome role if configured
      if (settings.welcome_role) {
        const role = member.guild.roles.cache.get(settings.welcome_role);
        if (role) {
          await member.roles.add(role).catch(() => {});
        }
      }
    }
  },
};
