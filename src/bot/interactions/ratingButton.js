const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
  // customId pattern: rating_<guildId>_<stars>_<orderId>_<productToken>
  // productToken is either a numeric index into ratingProducts.js (chosen
  // via /rating) or the literal "auto" (derive product from the real order
  // record — used by the automatic post-payment rating prompt).
  matches: (customId) => /^rating_\d+_[1-5]_\d+_(\d+|auto)$/.test(customId),
  async execute(interaction) {
    const parts = interaction.customId.split('_');
    const guildId = parts[1];
    const stars = parts[2];
    const orderId = parts[3];
    const productToken = parts[4];

    const modal = new ModalBuilder()
      .setCustomId(`rating_modal_${guildId}_${stars}_${orderId}_${productToken}`)
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
