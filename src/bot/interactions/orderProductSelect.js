const PaymentService = require('../../services/PaymentService');

module.exports = {
  // The select menu's customId is "order_select_product_q<quantity>" (see orderTicket.js),
  // so it must be matched dynamically, not as an exact static customId.
  matches: (customId) => customId.startsWith('order_select_product'),
  isSelectMenu: true,
  async execute(interaction) {
    const productId = Number(interaction.values[0]);
    
    // Extract quantity from customId (e.g., "order_select_product_q5" -> quantity = 5)
    const quantityMatch = interaction.customId.match(/q(\d+)/);
    const quantity = quantityMatch ? parseInt(quantityMatch[1], 10) : 1;

    await interaction.reply({ content: '⏳ Memproses order...', ephemeral: true });
    await PaymentService.startOrder(interaction.channel, interaction.user, productId, quantity);
  },
};

