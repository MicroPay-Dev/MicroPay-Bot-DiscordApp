const { buildDefaultPanelUI } = require('./catalogUiHelpers');

module.exports = {
  customId: 'catalog_back_to_main',
  async execute(interaction) {
    await interaction.update(buildDefaultPanelUI(interaction.guild.id));
  },
};
