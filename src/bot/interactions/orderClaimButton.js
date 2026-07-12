const PaymentService = require('../../services/PaymentService');
const settingsRepo = require('../../repositories/settingsRepo');

module.exports = {
  matches: (customId) => customId.startsWith('order_claim_'),
  async execute(interaction) {
    const settings = settingsRepo.get(interaction.guild.id);
    const adminRoleId = settings?.admin_role;

    // Check admin permission
    if (adminRoleId && !interaction.member.roles.cache.has(adminRoleId)) {
      return interaction.reply({ content: '❌ Hanya admin yang bisa claim order.', ephemeral: true });
    }

    const orderId = parseInt(interaction.customId.replace('order_claim_', ''));
    await interaction.reply({ content: '⏳ Memproses...', ephemeral: true });
    await PaymentService.claimOrder(interaction.channel, orderId, interaction.user);
  },
};
