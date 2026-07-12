const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ProductService = require('../../services/ProductService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('product-remove')
    .setDescription('Hapus (nonaktifkan) produk yang salah/tidak terpakai')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addIntegerOption((o) =>
      o.setName('produk').setDescription('Pilih produk yang ingin dihapus').setRequired(true).setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const products = ProductService.listProducts(interaction.guild.id);
    const filtered = products
      .filter((p) => p.name.toLowerCase().includes(focused))
      .slice(0, 25)
      .map((p) => ({
        name: `${p.name} - Rp${p.price.toLocaleString('id-ID')} (#${p.id})`,
        value: p.id,
      }));
    await interaction.respond(filtered);
  },

  async execute(interaction) {
    const productId = interaction.options.getInteger('produk');
    const product = ProductService.disableProduct(interaction.guild.id, productId);

    if (!product) {
      await interaction.reply({ content: '❌ Produk tidak ditemukan.', ephemeral: true });
      return;
    }

    await interaction.reply({
      content: `✅ Produk **${product.name}** (#${product.id}) berhasil dihapus dari list. Produk lama yang sudah pernah di-order tidak terpengaruh.`,
      ephemeral: true,
    });
  },
};
