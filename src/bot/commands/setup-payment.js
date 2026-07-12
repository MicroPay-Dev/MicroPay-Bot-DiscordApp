const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const settingsRepo = require('../../repositories/settingsRepo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-payment')
    .setDescription('Setup payment engine (admin role, QRIS image, log channel)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addRoleOption((o) => o.setName('admin_role').setDescription('Role yang bisa approve/reject pembayaran').setRequired(true))
    .addStringOption((o) => o.setName('qris_image_url').setDescription('URL gambar QRIS').setRequired(true))
    .addChannelOption((o) => o.setName('log_channel').setDescription('Channel untuk log').setRequired(false)),

  async execute(interaction) {
    const adminRole = interaction.options.getRole('admin_role');
    const qrisUrl = interaction.options.getString('qris_image_url');
    const logChannel = interaction.options.getChannel('log_channel');

    settingsRepo.setAdminRole(interaction.guild.id, adminRole.id);
    settingsRepo.setQrisImage(interaction.guild.id, qrisUrl);
    if (logChannel) settingsRepo.setLogChannel(interaction.guild.id, logChannel.id);

    await interaction.reply({
      content: `✅ Payment engine dikonfigurasi.\n- Admin role: ${adminRole}\n- QRIS image: set\n- Log channel: ${logChannel || 'belum diatur'}`,
      ephemeral: true,
    });
  },
};
