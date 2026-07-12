const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const BackupService = require('../../services/BackupService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backup-list')
    .setDescription('Lihat daftar backup database yang tersimpan')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const backups = BackupService.listBackups();

    if (!backups.length) {
      await interaction.reply({
        content: 'Belum ada backup. Gunakan `/backup-create` untuk membuat backup pertama.',
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('💾 Daftar Backup Database')
      .setColor(0x718096)
      .setDescription(
        backups
          .slice(0, 15)
          .map((b) => `**${b.filename}**\n${(b.sizeBytes / 1024).toFixed(1)} KB • ${b.createdAt.toLocaleString('id-ID')}`)
          .join('\n\n')
      )
      .setFooter({ text: `Total: ${backups.length} backup tersimpan` });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
