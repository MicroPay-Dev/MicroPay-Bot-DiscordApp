const { buildBuyUI } = require('./catalogUiHelpers');

module.exports = {
  customId: 'catalog_switch_to_buy',
  async execute(interaction) {
    await interaction.deferUpdate();
    const ui = buildBuyUI(interaction.guild.id);
    await interaction.editReply(ui);
  },
};
