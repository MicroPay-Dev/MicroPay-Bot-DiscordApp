const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ProductService = require('../../services/ProductService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('product-add')
    .setDescription('Tambah produk baru')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) => o.setName('name').setDescription('Nama produk').setRequired(true))
    .addIntegerOption((o) => o.setName('price').setDescription('Harga (Rupiah)').setRequired(true))
    .addStringOption((o) =>
      o
        .setName('type')
        .setDescription('Tipe produk (menentukan cara delivery setelah pembayaran)')
        .setRequired(false)
        .addChoices(
          { name: 'General (kirim teks delivery_content)', value: 'general' },
          { name: 'Joki Quest (form login + target quest)', value: 'joki_quest' },
          { name: 'Auto Quest VIP (kirim file zip)', value: 'auto_quest_vip' },
          { name: 'Web Panel (form nama website/brand/domain)', value: 'web_panel' }
        )
    )
    .addStringOption((o) => o.setName('description').setDescription('Deskripsi').setRequired(false))
    .addStringOption((o) =>
      o.setName('delivery_content').setDescription('Konten yang dikirim setelah pembayaran disetujui').setRequired(false)
    ),

  async execute(interaction) {
    const name = interaction.options.getString('name');
    const price = interaction.options.getInteger('price');
    const type = interaction.options.getString('type');
    const description = interaction.options.getString('description');
    const deliveryContent = interaction.options.getString('delivery_content');

    const product = ProductService.addProduct(interaction.guild.id, {
      name,
      price,
      type,
      description,
      deliveryContent,
    });

    await interaction.reply({
      content: `✅ Produk **${product.name}** (#${product.id}) ditambahkan dengan harga Rp${product.price.toLocaleString('id-ID')}`,
      ephemeral: true,
    });
  },
};
