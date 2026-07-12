const { SlashCommandBuilder } = require('discord.js');
const createSupportTicket = require('../tickets/supportTicket');

module.exports = {
  data: new SlashCommandBuilder().setName('support').setDescription('Buka ticket support'),

  async execute(interaction) {
    await interaction.reply({ content: '🎫 Membuka support ticket...', ephemeral: true });
    await createSupportTicket(interaction);
  },
};
