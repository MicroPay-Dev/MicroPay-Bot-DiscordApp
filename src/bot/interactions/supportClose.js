const TicketService = require('../../services/TicketService');

module.exports = {
  customId: 'support_close',
  async execute(interaction) {
    if (!TicketService.canCloseTicket(interaction.guild, interaction.member)) {
      await interaction.reply({
        content: '❌ Hanya Owner atau Admin yang bisa menutup ticket ini.',
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({ content: '🔒 Menutup ticket...', ephemeral: true });
    await TicketService.closeTicket(interaction.channel);
  },
};
