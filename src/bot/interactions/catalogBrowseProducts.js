const { buildBrowseUI } = require('./catalogUiHelpers');

module.exports = {
  customId: 'catalog_browse_products',
  async execute(interaction) {
    await interaction.update(buildBrowseUI(interaction.guild.id));
  },
};
