const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const settingsRepo = require('../../repositories/settingsRepo');
const TicketService = require('../../services/TicketService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('orderdone')
    .setDescription('Konfirmasi orderan selesai, kirim notifikasi, dan tutup ticket ini')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((o) => o.setName('user').setDescription('Buyer yang order-nya sudah selesai').setRequired(true)),

  async execute(interaction) {
    if (!TicketService.canCloseTicket(interaction.guild, interaction.member)) {
      await interaction.reply({ content: '❌ Hanya Owner atau Admin yang bisa menggunakan command ini.', ephemeral: true });
      return;
    }

    const targetUser = interaction.options.getUser('user');
    const settings = settingsRepo.get(interaction.guild.id);

    if (!settings?.orderdone_channel) {
      await interaction.reply({
        content: '⚠️ Channel notifikasi orderdone belum diatur. Atur dulu lewat Dashboard > Settings.',
        ephemeral: true,
      });
      return;
    }

    const notifyChannel = interaction.guild.channels.cache.get(settings.orderdone_channel);
    if (!notifyChannel) {
      await interaction.reply({ content: '⚠️ Channel notifikasi tidak ditemukan (mungkin sudah dihapus).', ephemeral: true });
      return;
    }

    const messageTemplate = settings.orderdone_message || '✅ Pesanan {user} sudah selesai diproses. Terima kasih sudah berbelanja!';
    const finalMessage = messageTemplate.replace(/{user}/g, `<@${targetUser.id}>`);

    await notifyChannel.send({ content: finalMessage }).catch(() => {});

    await interaction.reply({ content: `✅ Order ${targetUser} ditandai selesai. Ticket akan ditutup...`, ephemeral: true });
    await TicketService.closeTicket(interaction.channel);
  },
};
