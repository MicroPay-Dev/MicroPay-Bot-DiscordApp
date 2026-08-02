const { buildBrowseUI } = require('./catalogUiHelpers');

module.exports = {
  customId: 'catalog_switch_to_browse',
  async execute(interaction) {
    await interaction.update(buildBrowseUI(interaction.guild.id));
  },
};
