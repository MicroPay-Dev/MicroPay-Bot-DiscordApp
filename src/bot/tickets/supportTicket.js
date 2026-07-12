const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const TicketService = require('../../services/TicketService');

/**
 * Create a private support channel for the user with a close button.
 */
module.exports = async function createSupportTicket(interaction) {
  const channel = await TicketService.createSupportTicket(interaction.guild, interaction.user);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('support_close').setLabel('Close Ticket').setStyle(ButtonStyle.Secondary)
  );

  await channel.send({
    content: `👋 <@${interaction.user.id}> Tim support akan segera membantu kamu. Jelaskan kendala kamu di sini.`,
    components: [row],
  });

  return channel;
};
