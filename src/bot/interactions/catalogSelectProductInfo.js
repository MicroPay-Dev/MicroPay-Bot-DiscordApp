const { EmbedBuilder } = require('discord.js');
const catalogProductRepo = require('../../repositories/catalogProductRepo');
const { switchButtonsRow } = require('./catalogUiHelpers');

module.exports = {
  customId: 'catalog_select_product_info',
  async execute(interaction) {
    const productId = Number(interaction.values[0]);
    const product = catalogProductRepo.getById(productId);

    if (!product) {
      await interaction.update({ content: '⚠️ Produk tidak ditemukan.', embeds: [], components: [switchButtonsRow('browse')] });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`📦 ${product.name}`)
      .setDescription(product.description || '(Belum ada deskripsi untuk produk ini)')
      .setColor(0x5865f2);

    await interaction.update({ content: '', embeds: [embed], components: [switchButtonsRow('browse')] });
  },
};
