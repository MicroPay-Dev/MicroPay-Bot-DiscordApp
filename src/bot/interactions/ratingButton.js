const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
  // customId pattern: rating_<stars>_<orderId>
  matches: (customId) => /^rating_[1-5]_\d+$/.test(customId),
  async execute(interaction) {
    const parts = interaction.customId.split('_');
    const stars = parts[1];
    const orderId = parts[2];

    const modal = new ModalBuilder()
      .setCustomId(`rating_modal_${stars}_${orderId}`)
      .setTitle(`Rating ${stars} Bintang`)
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('comment')
            .setLabel('Tulis ulasan kamu (opsional)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Contoh: Pelayanan cepat, produk langsung jadi, recommended!')
            .setRequired(false)
            .setMaxLength(300)
        )
      );

    await interaction.showModal(modal);
  },
};
