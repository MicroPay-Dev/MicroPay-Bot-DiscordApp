const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('order').setDescription('Buka ticket order untuk membeli produk'),

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('order_quantity_modal')
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

