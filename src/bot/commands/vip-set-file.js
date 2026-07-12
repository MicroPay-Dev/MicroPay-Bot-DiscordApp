const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const AutoQuestVipService = require('../../services/AutoQuestVipService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vip-set-file')
    .setDescription('Upload/ganti file MicroStore-Auto-Quest-Discord-VIP.zip yang akan dikirim ke buyer')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addAttachmentOption((o) => o.setName('file').setDescription('File .zip Auto Quest VIP').setRequired(true)),

  async execute(interaction) {
    const attachment = interaction.options.getAttachment('file');

    if (!attachment.name.toLowerCase().endsWith('.zip')) {
      await interaction.reply({ content: '⚠️ File harus berformat .zip', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const saved = await AutoQuestVipService.setFileFromAttachment(interaction.guild.id, attachment, interaction.user.id);
      await interaction.editReply(`✅ File Auto Quest VIP diperbarui: **${saved.original_name}**`);
    } catch (err) {
      console.error('vip-set-file error:', err);
      await interaction.editReply('❌ Gagal menyimpan file. Coba lagi.');
    }
  },
};
