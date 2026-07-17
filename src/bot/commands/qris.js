const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const settingsRepo = require('../../repositories/settingsRepo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('qris')
    .setDescription('Tampilkan gambar QRIS yang sudah diupload lewat dashboard')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const settings = settingsRepo.get(interaction.guild.id);

    if (!settings?.qris_image_url) {
      await interaction.reply({
        content: '⚠️ Belum ada gambar QRIS yang tersimpan. Upload dulu lewat Dashboard > Settings > Payment & Logs.',
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('📷 QRIS Saat Ini')
      .setImage(settings.qris_image_url)
      .setColor(0x5865f2);

    await interaction.reply({ embeds: [embed] });
  },
};
