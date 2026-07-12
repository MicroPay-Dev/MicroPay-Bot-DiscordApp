const JokiQuestService = require('../../services/JokiQuestService');

module.exports = {
  matches: (customId) => customId.startsWith('joki_form_start_'),
  async execute(interaction) {
    const jokiOrderId = Number(interaction.customId.split('_').pop());
    await interaction.showModal(JokiQuestService.buildModal(jokiOrderId));
  },
};
