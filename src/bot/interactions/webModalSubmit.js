const WebPanelService = require('../../services/WebPanelService');

module.exports = {
  // matches web_modal_1_<id> or web_modal_2_<id>
  matches: (customId) => customId.startsWith('web_modal_1_') || customId.startsWith('web_modal_2_'),
  async execute(interaction) {
    const webOrderId = Number(interaction.customId.split('_').pop());

    if (interaction.customId.startsWith('web_modal_1_')) {
      await WebPanelService.handleStep1Submit(interaction, webOrderId);
    } else {
      await WebPanelService.handleStep2Submit(interaction, webOrderId);
    }
  },
};
