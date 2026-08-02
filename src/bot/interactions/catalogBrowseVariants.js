const { buildBuyUI } = require('./catalogUiHelpers');

module.exports = {
  customId: 'catalog_browse_variants',
  async execute(interaction) {
    await interaction.update(buildBuyUI(interaction.guild.id));
  },
};
