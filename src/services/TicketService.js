const { ChannelType, PermissionsBitField } = require('discord.js');
const ticketRepo = require('../repositories/ticketRepo');
const settingsRepo = require('../repositories/settingsRepo');
const LogService = require('./LogService');
const TranscriptService = require('./TranscriptService');

async function createTicketChannel(guild, user, type) {
  const settings = settingsRepo.get(guild.id);
  const categoryId = type === 'order' ? settings?.order_category : settings?.support_category;

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
    {
      id: user.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.ReadMessageHistory,
      ],
    },
  ];

  // Explicitly grant the bot itself access, regardless of how restrictive
  // the target category's permissions are. Without this, a category that
  // denies @everyone (which the bot inherits from unless overridden) can
  // silently block the bot from sending messages in channels it just
  // created there — surfacing as "DiscordAPIError[50001]: Missing Access".
  if (guild.members.me) {
    overwrites.push({
      id: guild.members.me.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.ManageChannels,
        PermissionsBitField.Flags.ManageMessages,
      ],
    });
  }

  if (settings?.admin_role) {
    overwrites.push({
      id: settings.admin_role,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
      ],
    });
  }

  const channel = await guild.channels.create({
    name: `${type}-${user.username}`.toLowerCase().slice(0, 90),
    type: ChannelType.GuildText,
    parent: categoryId || undefined,
    permissionOverwrites: overwrites,
  });

  ticketRepo.create(guild.id, user.id, channel.id, type);
  await LogService.log(guild, 'ticket', `Ticket ${type} dibuka oleh <@${user.id}> di ${channel}`);

  return channel;
}

module.exports = {
  createOrderTicket(guild, user) {
    return createTicketChannel(guild, user, 'order');
  },

  createSupportTicket(guild, user) {
    return createTicketChannel(guild, user, 'support');
  },

  async closeTicket(channel) {
    const ticket = ticketRepo.getByChannel(channel.id);
    if (!ticket) {
      await channel.send('⚠️ Informasi ticket tidak ditemukan. Channel akan dihapus.');
      setTimeout(() => channel.delete().catch(() => {}), 3000);
      return;
    }

    // Export transcript sebelum delete
    const transcript = await TranscriptService.exportTranscript(channel, ticket.type, ticket.user_id);

    let message = '✅ Ticket ditutup.\n\n';
    if (transcript.success) {
      message += `📋 **Transcript Tersimpan**\n`;
      message += `  Pesan: ${transcript.messageCount}\n`;
      message += `  File: \`${transcript.filename}\`\n\n`;
    } else {
      message += `⚠️ Gagal export transcript: ${transcript.error}\n\n`;
    }
    message += '🔒 Channel akan dihapus dalam 5 detik...';

    ticketRepo.close(channel.id);
    await LogService.log(channel.guild, 'ticket', `Ticket ${ticket.type} ditutup di ${channel}`);
    await channel.send(message);
    setTimeout(() => channel.delete().catch(() => {}), 5000);
  },
};

