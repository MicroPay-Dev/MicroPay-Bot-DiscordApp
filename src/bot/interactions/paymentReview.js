const settingsRepo = require('../../repositories/settingsRepo');
const PaymentService = require('../../services/PaymentService');

function isAdmin(interaction, settings) {
  if (interaction.member.permissions.has('ManageGuild')) return true;
  if (settings?.admin_role && interaction.member.roles.cache.has(settings.admin_role)) return true;
  return false;
}

module.exports = {
  // matches payment_approve_<id> or payment_reject_<id>
  matches: (customId) => customId.startsWith('payment_approve_') || customId.startsWith('payment_reject_'),

  async execute(interaction) {
    const settings = settingsRepo.get(interaction.guild.id);

    if (!isAdmin(interaction, settings)) {
      return interaction.reply({ content: '⛔ Kamu tidak punya izin untuk approve/reject pembayaran.', ephemeral: true });
    }

    const isApprove = interaction.customId.startsWith('payment_approve_');
    const paymentId = Number(interaction.customId.split('_').pop());

    await interaction.reply({ content: `⏳ Memproses ${isApprove ? 'approval' : 'rejection'}...`, ephemeral: true });

    if (isApprove) {
      await PaymentService.approve(interaction.channel, paymentId, interaction.user);
    } else {
      await PaymentService.reject(interaction.channel, paymentId, interaction.user);
    }
  },
};
