const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
  customId: 'order_panel_select_product',
  async execute(interaction) {
    const productId = interaction.values[0];

    const modal = new ModalBuilder()
      .setCustomId(`order_panel_quantity_modal_p${productId}`)
      .setTitle('Berapa jumlah yang ingin dibeli?')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('quantity')
            .setLabel('Jumlah Order')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Contoh: 1, 2, 3, dst')
            .setMinLength(1)
            .setMaxLength(3)
            .setRequired(true)
        )
      );

    await interaction.showModal(modal);
  },
};
