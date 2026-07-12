const PaymentService = require('../../services/PaymentService');
const settingsRepo = require('../../repositories/settingsRepo');

module.exports = {
  matches: (customId) => customId.startsWith('order_complete_'),
  async execute(interaction) {
    const settings = settingsRepo.get(interaction.guild.id);
    const adminRoleId = settings?.admin_role;

    if (adminRoleId && !interaction.member.roles.cache.has(adminRoleId)) {
      return interaction.reply({ content: '❌ Hanya admin yang bisa menyelesaikan order.', ephemeral: true });
    }

    const orderId = parseInt(interaction.customId.replace('order_complete_', ''));
    await interaction.reply({ content: '⏳ Memproses...', ephemeral: true });
    await PaymentService.completeOrder(interaction.channel, orderId, interaction.user);
  },
};
