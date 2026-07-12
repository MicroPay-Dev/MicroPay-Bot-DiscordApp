const { SlashCommandBuilder } = require('discord.js');
const youtubeChannelRepo = require('../../repositories/youtubeChannelRepo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('youtube-list')
    .setDescription('List semua YouTube channel yang di-monitor'),

  async execute(interaction) {
    const channels = youtubeChannelRepo.listByGuild(interaction.guild.id);

    if (!channels.length) {
      return interaction.reply({
        content: '📺 Belum ada YouTube channel yang di-monitor. Gunakan `/youtube-add` untuk menambah.',
        ephemeral: true,
      });
    }

    const list = channels
      .map(
        (ch) =>
          `**#${ch.id}** — [${ch.youtube_channel_name}](https://www.youtube.com/channel/${ch.youtube_channel_id})\n` +
          `  Notif ke: <#${ch.channel_id}>\n` +
          `  Last check: ${ch.last_check ? new Date(ch.last_check).toLocaleString('id-ID') : 'belum'}`
      )
      .join('\n\n');

    await interaction.reply({
      content: `📺 **YouTube Channels di-Monitor**\n\n${list}`,
      ephemeral: true,
    });
  },
};
