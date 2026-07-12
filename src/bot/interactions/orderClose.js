const TicketService = require('../../services/TicketService');

module.exports = {
  customId: 'order_close',
  async execute(interaction) {
    await interaction.reply({ content: '🔒 Menutup ticket...', ephemeral: true });
    await TicketService.closeTicket(interaction.channel);
  },
};
