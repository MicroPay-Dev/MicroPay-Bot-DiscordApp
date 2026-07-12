const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const youtubeChannelRepo = require('../../repositories/youtubeChannelRepo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('youtube-remove')
    .setDescription('Hapus channel YouTube dari monitoring')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addIntegerOption((o) => o.setName('monitor_id').setDescription('ID monitoring (lihat /youtube-list)').setRequired(true)),

  async execute(interaction) {
    const monitorId = interaction.options.getInteger('monitor_id');

    const existing = youtubeChannelRepo.getById(monitorId);
    if (!existing || existing.guild_id !== interaction.guild.id) {
      return interaction.reply({ content: '⚠️ Monitoring ID tidak ditemukan.', ephemeral: true });
    }

    youtubeChannelRepo.remove(monitorId);
    await interaction.reply({
      content: `✅ Monitoring untuk **${existing.youtube_channel_name}** dihapus.`,
      ephemeral: true,
    });
  },
};
