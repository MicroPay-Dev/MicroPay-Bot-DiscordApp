const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const settingsRepo = require('../../repositories/settingsRepo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('qris')
    .setDescription('Lihat atau ganti gambar QRIS untuk pembayaran')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addAttachmentOption((o) =>
      o.setName('gambar').setDescription('Upload gambar QRIS baru (kosongkan untuk lihat yang sekarang)').setRequired(false)
    ),

  async execute(interaction) {
    const attachment = interaction.options.getAttachment('gambar');

    // No attachment provided -> just show the currently saved QRIS image.
    if (!attachment) {
      const settings = settingsRepo.get(interaction.guild.id);
      if (!settings?.qris_image_url) {
        await interaction.reply({
          content: '⚠️ Belum ada gambar QRIS yang tersimpan. Upload dengan `/qris gambar:[file]`.',
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('📷 QRIS Saat Ini')
        .setImage(settings.qris_image_url)
        .setColor(0x5865f2);

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // Attachment provided -> validate and update.
    const isImage = attachment.contentType?.startsWith('image/');
    if (!isImage) {
      await interaction.reply({ content: '❌ File harus berupa gambar (JPG/PNG).', ephemeral: true });
      return;
    }

    settingsRepo.setQrisImage(interaction.guild.id, attachment.url);

    const embed = new EmbedBuilder()
      .setTitle('✅ QRIS Berhasil Diperbarui')
      .setDescription('Gambar QRIS ini akan otomatis muncul di setiap order pembayaran baru.')
      .setImage(attachment.url)
      .setColor(0x57f287);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
