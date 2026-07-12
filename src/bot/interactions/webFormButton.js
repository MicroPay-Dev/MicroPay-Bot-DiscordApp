const WebPanelService = require('../../services/WebPanelService');

module.exports = {
  // matches web_form_start_<webOrderId>
  matches: (customId) => customId.startsWith('web_form_start_'),
  async execute(interaction) {
    const webOrderId = Number(interaction.customId.split('_').pop());
    await interaction.showModal(WebPanelService.buildStep1Modal(webOrderId));
  },
};
