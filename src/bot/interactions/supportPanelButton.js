const createSupportTicket = require('../tickets/supportTicket');

module.exports = {
  customId: 'support_panel_create_ticket',
  async execute(interaction) {
    await interaction.reply({ content: '⏳ Membuka support ticket kamu...', ephemeral: true });
    await createSupportTicket(interaction);
  },
};
