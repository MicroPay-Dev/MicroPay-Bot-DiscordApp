const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const settingsRepo = require('../../repositories/settingsRepo');
const StageService = require('../../services/StageService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-stage')
    .setDescription('Bot akan stay di Stage Channel ini agar member bisa lihat bot online')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((o) =>
      o
        .setName('stage')
        .setDescription('Stage Channel tempat bot akan stay')
        .addChannelTypes(ChannelType.GuildStageVoice)
        .setRequired(true)
    ),

  async execute(interaction) {
    const stageChannel = interaction.options.getChannel('stage');

    settingsRepo.setStage(interaction.guild.id, { enabled: true, channelId: stageChannel.id });

    try {
      await StageService.connect(interaction.guild, stageChannel.id);
      await interaction.reply({
        content: `✅ Bot akan stay di **${stageChannel.name}**. Member bisa lihat bot online langsung dari Stage tanpa command.`,
        ephemeral: true,
      });
    } catch (err) {
      await interaction.reply({
        content: `⚠️ Gagal join Stage: ${err.message}. Pastikan bot punya izin Connect di channel tersebut.`,
        ephemeral: true,
      });
    }
  },
};
