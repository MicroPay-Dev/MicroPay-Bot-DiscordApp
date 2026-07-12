const createOrderTicket = require('../tickets/orderTicket');

module.exports = {
  customId: 'order_quantity_modal',
  async execute(interaction) {
    const quantityInput = interaction.fields.getTextInputValue('quantity');
    const quantity = parseInt(quantityInput, 10);

    // Validasi: harus angka positif
    if (isNaN(quantity) || quantity < 1) {
      await interaction.reply({ content: '⚠️ Jumlah order harus angka positif (minimal 1).', ephemeral: true });
      return;
    }

    // Limit max 999 order per ticket (supaya tidak terlalu gila)
    if (quantity > 999) {
      await interaction.reply({ content: '⚠️ Jumlah order terlalu besar. Maksimal 999 per ticket.', ephemeral: true });
      return;
    }

    await interaction.reply({ content: `🛒 Membuka order ticket (jumlah: ${quantity})...`, ephemeral: true });
    await createOrderTicket(interaction, quantity);
  },
};
