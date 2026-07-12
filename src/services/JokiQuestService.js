const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
} = require('discord.js');
const jokiQuestRepo = require('../repositories/jokiQuestRepo');
const LogService = require('./LogService');

// 4 fields (Discord Email, Password Discord, Code Backup/Auth, Catatan) fit in a single modal
// (Discord caps modals at 5 text inputs), so no need to chain steps like Web Panel.

function buildModal(jokiOrderId) {
  return new ModalBuilder()
    .setCustomId(`joki_modal_${jokiOrderId}`)
    .setTitle('Form Joki Quest Discord')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('discord_email').setLabel('Discord Email').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('password_discord').setLabel('Password Discord').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('backup_code')
          .setLabel('Code Backup/Auth (jika ada 2FA)')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('catatan').setLabel('Catatan Tambahan (opsional)').setStyle(TextInputStyle.Paragraph).setRequired(false)
      )
    );
}

module.exports = {
  /**
   * Called from ProductService.deliver() right after payment is approved.
   * Sends a button in the (private) order channel that opens the form.
   */
  async startForm(channel, product, order) {
    const jokiOrder = jokiQuestRepo.create(order.id, channel.guild.id, order.user_id);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`joki_form_start_${jokiOrder.id}`)
        .setLabel('📝 Isi Form Joki Quest')
        .setStyle(ButtonStyle.Primary)
    );

    await channel.send({
      content: `<@${order.user_id}> Pembayaran disetujui ✅. Sebelum proses joki quest Discord dimulai, mohon isi data login berikut. ⚠️ Data ini sensitif (termasuk akses 2FA) dan hanya terlihat oleh kamu dan admin di channel privat ini.`,
      components: [row],
    });

    return jokiOrder;
  },

  buildModal,

  async handleSubmit(interaction, jokiOrderId) {
    jokiQuestRepo.saveForm(jokiOrderId, {
      discordEmail: interaction.fields.getTextInputValue('discord_email'),
      passwordDiscord: interaction.fields.getTextInputValue('password_discord'),
      backupCode: interaction.fields.getTextInputValue('backup_code'),
      catatan: interaction.fields.getTextInputValue('catatan'),
    });

    const data = jokiQuestRepo.getById(jokiOrderId);

    await interaction.reply({ content: '✅ Data login berhasil dikirim ke admin.', ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle('📝 Data Login Joki Quest Diterima')
      .setColor(0x9b59b6)
      .addFields(
        { name: 'Discord Email', value: data.discord_email || '-', inline: true },
        { name: 'Password Discord', value: data.password_discord || '-', inline: true },
        { name: 'Code Backup/Auth', value: data.backup_code || '-', inline: true },
        { name: 'Catatan', value: data.catatan || '-' }
      )
      .setFooter({ text: 'Channel ini privat — hapus data login setelah job selesai dengan tombol di bawah.' });

    const wipeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`joki_wipe_${jokiOrderId}`)
        .setLabel('🗑️ Hapus Data Login (selesai)')
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.channel.send({ embeds: [embed], components: [wipeRow] });
    await LogService.log(interaction.guild, 'order', `Joki Quest order #${jokiOrderId} form submitted oleh <@${data.user_id}>`);
  },

  async handleWipe(interaction, jokiOrderId) {
    jokiQuestRepo.wipeCredentials(jokiOrderId);
    await interaction.reply({ content: '🗑️ Data login Joki Quest sudah dihapus dari database.' });
    await LogService.log(interaction.guild, 'order', `Joki Quest order #${jokiOrderId} kredensial di-wipe oleh <@${interaction.user.id}>`);
  },
};
