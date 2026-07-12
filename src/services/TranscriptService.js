const fs = require('fs');
const path = require('path');
const transcriptRepo = require('../repositories/transcriptRepo');
const LogService = require('./LogService');
const { DATA_DIR } = require('../utils/dataDir');

const TRANSCRIPT_DIR = path.join(DATA_DIR, 'uploads', 'transcripts');

function ensureDir() {
  fs.mkdirSync(TRANSCRIPT_DIR, { recursive: true });
}

/**
 * Format message for transcript output.
 * Handles text, embeds, attachments, components.
 */
function formatMessage(msg) {
  const timestamp = msg.createdAt.toLocaleString('id-ID');
  const author = msg.author.username || 'Unknown';

  let content = `[${timestamp}] ${author}: `;

  // Text content
  if (msg.content) {
    content += msg.content;
  }

  // Embeds
  if (msg.embeds.length) {
    msg.embeds.forEach((e) => {
      if (e.title) content += `\n  [EMBED] ${e.title}`;
      if (e.description) content += `\n  ${e.description}`;
    });
  }

  // Attachments
  if (msg.attachments.size) {
    msg.attachments.forEach((a) => {
      content += `\n  [ATTACHMENT] ${a.name} (${a.size} bytes)`;
    });
  }

  // Components (buttons, selects) — just mention they existed
  if (msg.components.length) {
    content += `\n  [INTERACTIVE COMPONENTS: buttons/selects]`;
  }

  return content;
}

module.exports = {
  /**
   * Fetch all messages from a ticket channel, format as text, save to file.
   * Called before closing the ticket.
   */
  async exportTranscript(channel, ticketType, userId) {
    ensureDir();

    try {
      // Fetch all messages (Discord limits fetch to 100 per request, so paginate)
      let allMessages = [];
      let lastMessageId = null;

      while (true) {
        const options = { limit: 100 };
        if (lastMessageId) options.before = lastMessageId;

        const messages = await channel.messages.fetch(options);
        if (messages.size === 0) break;

        allMessages = [...messages.values(), ...allMessages]; // prepend (we fetched backwards)
        lastMessageId = messages.last()?.id;

        // Stop if we fetched less than 100 (means we hit the beginning)
        if (messages.size < 100) break;
      }

      // Format messages as text
      const lines = [
        `=== TRANSCRIPT: ${channel.name} ===`,
        `Channel: #${channel.name} (ID: ${channel.id})`,
        `Type: ${ticketType}`,
        `User: <@${userId}>`,
        `Exported: ${new Date().toLocaleString('id-ID')}`,
        `Total messages: ${allMessages.length}`,
        `${'='.repeat(50)}\n`,
        ...allMessages.map(formatMessage),
        `\n${'='.repeat(50)}`,
        `End of transcript`,
      ];

      const content = lines.join('\n');

      // Save to file
      const filename = `transcript-${channel.guild.id}-${channel.id}-${Date.now()}.txt`;
      const filePath = path.join(TRANSCRIPT_DIR, filename);
      fs.writeFileSync(filePath, content, 'utf8');

      // Save record to DB
      const record = transcriptRepo.save(
        channel.guild.id,
        channel.id,
        channel.name,
        ticketType,
        userId,
        content,
        filePath
      );

      await LogService.log(
        channel.guild,
        'transcript',
        `Transcript untuk ${ticketType} ticket #${channel.id} diexport oleh <@${userId}> (${allMessages.length} messages)`
      );

      return {
        success: true,
        transcriptId: record.id,
        messageCount: allMessages.length,
        filePath,
        filename,
      };
    } catch (err) {
      console.error('TranscriptService.exportTranscript error:', err);
      return {
        success: false,
        error: err.message,
      };
    }
  },

  /**
   * Retrieve saved transcript by ID.
   */
  getTranscript(id) {
    return transcriptRepo.getById(id);
  },

  /**
   * List all transcripts for a guild.
   */
  listTranscripts(guildId) {
    return transcriptRepo.listByGuild(guildId);
  },
};
