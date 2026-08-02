const { buildBuyUI } = require('./catalogUiHelpers');

module.exports = {
  customId: 'catalog_switch_to_buy',
  async execute(interaction) {
    await interaction.update(buildBuyUI(interaction.guild.id));
  },
};
