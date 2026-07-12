const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const settingsRepo = require('../../repositories/settingsRepo');
const { postVerifyPanel } = require('../utils/verifyPanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-verify')
    .setDescription('Setup verification channel + role')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((o) => o.setName('channel').setDescription('Channel').setRequired(true))
    .addRoleOption((o) => o.setName('role').setDescription('Role').setRequired(true))
    .addStringOption((o) => o.setName('judul').setDescription('Judul embed (opsional)').setRequired(false))
    .addStringOption((o) => o.setName('deskripsi').setDescription('Deskripsi embed (opsional)').setRequired(false))
    .addStringOption((o) => o.setName('gambar_url').setDescription('URL gambar embed (opsional)').setRequired(false)),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const role = interaction.options.getRole('role');
    settingsRepo.setVerify(interaction.guild.id, channel.id, role.id);

    settingsRepo.setVerifyEmbed(interaction.guild.id, {
      title: interaction.options.getString('judul'),
      description: interaction.options.getString('deskripsi'),
      imageUrl: interaction.options.getString('gambar_url'),
    });

    const settings = settingsRepo.get(interaction.guild.id);
    const sent = await postVerifyPanel(interaction.guild, settings);
    if (sent) settingsRepo.setVerifyMessageId(interaction.guild.id, sent.id);

    await interaction.reply({ content: '✅ Verification panel berhasil dipasang.', ephemeral: true });
  },
};
