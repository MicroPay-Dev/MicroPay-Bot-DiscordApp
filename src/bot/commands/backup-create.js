const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const BackupService = require('../../services/BackupService');

const DISCORD_UPLOAD_LIMIT_BYTES = 8 * 1024 * 1024; // 8MB default non-boosted server limit

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backup-create')
    .setDescription('Buat backup database sekarang (mencakup semua data toko)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const backup = await BackupService.createBackup(interaction.user.id);
      const pruned = BackupService.pruneOldBackups();

      const sizeKB = (backup.sizeBytes / 1024).toFixed(1);
      let content = `✅ Backup berhasil dibuat: **${backup.filename}** (${sizeKB} KB)`;
      if (pruned) content += `\n🗑️ ${pruned} backup lama dihapus (auto-prune).`;
      content +=
        '\n\n⚠️ File ini berisi **seluruh** data database (semua guild yang memakai bot ini, termasuk data sensitif seperti Joki Quest login). Simpan dengan hati-hati.';

      if (backup.sizeBytes <= DISCORD_UPLOAD_LIMIT_BYTES) {
        const attachment = new AttachmentBuilder(backup.filePath, { name: backup.filename });
        await interaction.editReply({ content, files: [attachment] });
      } else {
        content += `\n\n📁 File terlalu besar untuk dikirim via Discord (>8MB). Ambil langsung dari server di \`uploads/backups/${backup.filename}\`, atau lewat dashboard API.`;
        await interaction.editReply({ content });
      }
    } catch (err) {
      console.error('backup-create error:', err);
      await interaction.editReply('❌ Gagal membuat backup. Cek log server untuk detail.');
    }
  },
};
