const { StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const catalogProductRepo = require('../../repositories/catalogProductRepo');

module.exports = {
  customId: 'catalog_browse_products',
  async execute(interaction) {
    const products = catalogProductRepo.listActive(interaction.guild.id);

    if (!products.length) {
      await interaction.reply({ content: '⚠️ Belum ada produk yang tersedia saat ini.', ephemeral: true });
      return;
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId('catalog_select_product_info')
      .setPlaceholder('Pilih produk untuk lihat deskripsinya')
      .addOptions(products.slice(0, 25).map((p) => ({ label: p.name, value: String(p.id) })));

    await interaction.reply({
      content: 'Pilih produk di bawah untuk melihat deskripsinya:',
      components: [new ActionRowBuilder().addComponents(menu)],
      ephemeral: true,
    });
  },
};
