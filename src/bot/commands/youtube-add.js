const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const youtubeChannelRepo = require('../../repositories/youtubeChannelRepo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('youtube-add')
    .setDescription('Tambah channel YouTube untuk di-monitor')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) =>
      o.setName('channel_id').setDescription('YouTube Channel ID (UCxxxxxx)').setRequired(true)
    )
    .addStringOption((o) => o.setName('name').setDescription('Channel name (display)').setRequired(true))
    .addChannelOption((o) => o.setName('notify_channel').setDescription('Discord channel untuk notifikasi').setRequired(true)),

  async execute(interaction) {
    const youtubeChannelId = interaction.options.getString('channel_id');
    const channelName = interaction.options.getString('name');
    const discordChannel = interaction.options.getChannel('notify_channel');

    // Validate YouTube channel ID format (should be UC followed by alphanumeric)
    if (!/^UC[a-zA-Z0-9_-]{22}$/.test(youtubeChannelId)) {
      return interaction.reply({
        content: '⚠️ Format Channel ID invalid. Format: UC... (26 karakter total)',
        ephemeral: true,
      });
    }

    const record = youtubeChannelRepo.add(
      interaction.guild.id,
      discordChannel.id,
      youtubeChannelId,
      channelName
    );

    await interaction.reply({
      content: `✅ YouTube channel **${channelName}** ditambahkan untuk monitoring.\nNotifikasi akan dikirim ke ${discordChannel}`,
      ephemeral: true,
    });
  },
};
