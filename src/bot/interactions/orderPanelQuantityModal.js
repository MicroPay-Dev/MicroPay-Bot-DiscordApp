const PaymentService = require('../../services/PaymentService');

module.exports = {
  // customId pattern: order_panel_quantity_modal_p<productId>
  matches: (customId) => customId.startsWith('order_panel_quantity_modal_p'),
  async execute(interaction) {
    const productIdMatch = interaction.customId.match(/_p(\d+)$/);
    const productId = productIdMatch ? parseInt(productIdMatch[1], 10) : null;

    const quantityInput = interaction.fields.getTextInputValue('quantity');
    const quantity = parseInt(quantityInput, 10);

    if (!productId) {
      await interaction.reply({ content: '❌ Produk tidak valid.', ephemeral: true });
      return;
    }

    if (isNaN(quantity) || quantity < 1) {
      await interaction.reply({ content: '⚠️ Jumlah order harus angka positif (minimal 1).', ephemeral: true });
      return;
    }

    if (quantity > 999) {
      await interaction.reply({ content: '⚠️ Jumlah order terlalu besar. Maksimal 999 per ticket.', ephemeral: true });
      return;
    }

    await interaction.reply({ content: '⏳ Memproses order...', ephemeral: true });
    await PaymentService.startOrderManual(interaction.channel, interaction.user, productId, quantity);
  },
};
