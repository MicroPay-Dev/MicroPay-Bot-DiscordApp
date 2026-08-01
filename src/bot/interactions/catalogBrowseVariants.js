const { StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const catalogVariantRepo = require('../../repositories/catalogVariantRepo');

module.exports = {
  customId: 'catalog_browse_variants',
  async execute(interaction) {
    const variants = catalogVariantRepo.listActiveByGuild(interaction.guild.id);

    if (!variants.length) {
      await interaction.reply({ content: '⚠️ Belum ada produk yang bisa dibeli saat ini.', ephemeral: true });
      return;
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId('catalog_select_variant_buy')
      .setPlaceholder('Pilih varian yang ingin dibeli')
      .addOptions(
        variants.slice(0, 25).map((v) => ({
          label: `${v.product_name} - ${v.name}`,
          description: `Rp${v.price.toLocaleString('id-ID')}`,
          value: String(v.id),
        }))
      );

    await interaction.reply({
      content: 'Pilih varian yang ingin kamu beli:',
      components: [new ActionRowBuilder().addComponents(menu)],
      ephemeral: true,
    });
  },
};
