const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
  // customId pattern: rating_<guildId>_<stars>_<orderId>
  // The guildId is embedded because this button can be clicked from a DM
  // (e.g. after /rating), where interaction.guild is null.
  matches: (customId) => /^rating_\d+_[1-5]_\d+$/.test(customId),
  async execute(interaction) {
    const parts = interaction.customId.split('_');
    const guildId = parts[1];
    const stars = parts[2];
    const orderId = parts[3];

    const modal = new ModalBuilder()
      .setCustomId(`rating_modal_${guildId}_${stars}_${orderId}`)
      .setTitle(`Rating ${stars} Bintang`)
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('product')
            .setLabel('Produk yang kamu beli')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Contoh: Nitro Boost 1 Bulan')
            .setRequired(false)
            .setMaxLength(100)
        ),
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
