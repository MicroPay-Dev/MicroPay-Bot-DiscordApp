const { buildBrowseUI } = require('./catalogUiHelpers');

module.exports = {
  customId: 'catalog_switch_to_browse',
  async execute(interaction) {
    await interaction.deferUpdate();
    const ui = buildBrowseUI(interaction.guild.id);
    await interaction.editReply(ui);
  },
};
