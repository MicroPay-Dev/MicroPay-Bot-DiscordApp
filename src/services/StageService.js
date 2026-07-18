const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const LogService = require('./LogService');

// One active connection per guild, so re-triggering setup/startup doesn't
// pile up duplicate connections to the same stage.
const activeConnections = new Map();

module.exports = {
  /**
   * Joins the bot into a Stage Channel and keeps it there so members can
   * see the bot present just by looking at the stage — no command needed.
   * The bot joins as a silent audience member (self-muted/deafened); it
   * does not request to speak or transmit any audio.
   */
  connect(guild, channelId) {
    // Drop any existing connection for this guild first (e.g. channel changed).
    this.disconnect(guild.id);

    const connection = joinVoiceChannel({
      channelId,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: true,
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        // Could be a temporary network blip or a real move/kick — wait to
        // see which, then only give up (and log it) if it's the latter.
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        connection.destroy();
        activeConnections.delete(guild.id);
        await LogService.log(guild, 'stage', '⚠️ Bot terputus dari Stage Channel dan tidak berhasil reconnect otomatis.').catch(() => {});
      }
    });

    activeConnections.set(guild.id, connection);
    return connection;
  },

  disconnect(guildId) {
    const existing = activeConnections.get(guildId);
    if (existing) {
      existing.destroy();
      activeConnections.delete(guildId);
    }
  },

  isConnected(guildId) {
    return activeConnections.has(guildId);
  },
};
