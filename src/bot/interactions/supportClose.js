const TicketService = require('../../services/TicketService');

module.exports = {
  customId: 'support_close',
  async execute(interaction) {
    await interaction.reply({ content: '🔒 Menutup ticket...', ephemeral: true });
    await TicketService.closeTicket(interaction.channel);
  },
};
