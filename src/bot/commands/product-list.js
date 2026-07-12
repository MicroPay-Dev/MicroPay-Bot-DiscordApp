const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ProductService = require('../../services/ProductService');

module.exports = {
  data: new SlashCommandBuilder().setName('product-list').setDescription('Lihat daftar produk yang tersedia'),

  async execute(interaction) {
    const products = ProductService.listProducts(interaction.guild.id);

    if (!products.length) {
      await interaction.reply({ content: 'Belum ada produk yang tersedia.', ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('🛒 Daftar Produk')
      .setColor(0x2b6cb0)
      .setDescription(
        products.map((p) => `**#${p.id} ${p.name}** - Rp${p.price.toLocaleString('id-ID')}\n${p.description || ''}`).join('\n\n')
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
