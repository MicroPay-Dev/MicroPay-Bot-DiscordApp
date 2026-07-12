const JokiQuestService = require('../../services/JokiQuestService');

module.exports = {
  matches: (customId) => customId.startsWith('joki_modal_') || customId.startsWith('joki_wipe_'),
  async execute(interaction) {
    if (interaction.customId.startsWith('joki_modal_')) {
      // Modal submit (form)
      const jokiOrderId = Number(interaction.customId.split('_').pop());
      await JokiQuestService.handleSubmit(interaction, jokiOrderId);
    } else if (interaction.customId.startsWith('joki_wipe_')) {
      // Wipe button
      const jokiOrderId = Number(interaction.customId.split('_').pop());
      await JokiQuestService.handleWipe(interaction, jokiOrderId);
    }
  },
};
