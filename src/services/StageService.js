const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const { StageInstancePrivacyLevel } = require('discord.js');
const LogService = require('./LogService');

// One active connection per guild, so re-triggering setup/startup doesn't
// pile up duplicate connections to the same stage.
const activeConnections = new Map();
// Pending setTimeout handles for reconnect attempts, so repeated disconnects
// don't stack up multiple parallel retry loops for the same guild.
const pendingRetries = new Map();

module.exports = {
  /**
   * Joins the bot into a Stage Channel and keeps it there so members can
   * see the bot present just by looking at the stage — no command needed.
   * The bot joins as a silent audience member (self-muted/deafened); it
   * does not request to speak or transmit any audio.
   *
   * Joining the voice connection alone does NOT make the stage show as
   * "Live" in Discord — a Stage Instance (with a topic) has to be started
   * explicitly, which is what actually puts the ⚡ Live badge on the
   * channel and makes it visible/joinable from the member list.
   */
  async connect(guild, channelId) {
    // Drop any existing connection for this guild first (e.g. channel changed).
    this.disconnect(guild.id);

    const connection = joinVoiceChannel({
      channelId,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: true,
    });

    const stageChannel = guild.channels.cache.get(channelId);
    if (stageChannel && !stageChannel.stageInstance) {
      try {
        await stageChannel.createStageInstance({
          topic: '🟢 MICROSTORE Online',
          privacyLevel: StageInstancePrivacyLevel.GuildOnly,
        });
      } catch (err) {
        // Most likely cause: bot is missing Manage Channels on this stage,
        // or a stage instance was created by someone else in a race.
        await LogService.log(
          guild,
          'stage',
          `⚠️ Bot berhasil join Stage Channel tapi gagal memulai sesi Stage (Live): ${err.message}. Pastikan bot punya izin Manage Channels di channel ini.`
        ).catch(() => {});
      }
    }

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        // Could be a temporary network blip or a real move/kick — wait to
        // see which. If Discord resumes the connection on its own within
        // this window, nothing else needs to happen.
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        // Did NOT auto-resume — actively rejoin instead of giving up, so the
        // bot keeps coming back to the stage instead of silently vanishing.
        connection.destroy();
        activeConnections.delete(guild.id);
        await LogService.log(guild, 'stage', '⚠️ Bot terputus dari Stage Channel, mencoba reconnect otomatis...').catch(() => {});
        this.scheduleReconnect(guild, channelId);
      }
    });

    connection.on(VoiceConnectionStatus.Destroyed, () => {
      activeConnections.delete(guild.id);
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
    const pendingRetry = pendingRetries.get(guildId);
    if (pendingRetry) {
      clearTimeout(pendingRetry);
      pendingRetries.delete(guildId);
    }
  },

  isConnected(guildId) {
    return activeConnections.has(guildId);
  },

  /**
   * Keeps retrying to rejoin the stage every 10s until it succeeds. This is
   * what actually makes the bot "stay 24/7" — a single failed reconnect
   * attempt (e.g. a brief network blip on Railway's side) no longer means
   * the bot is gone from the stage for good.
   */
  scheduleReconnect(guild, channelId) {
    const existingTimer = pendingRetries.get(guild.id);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(async () => {
      pendingRetries.delete(guild.id);
      try {
        await this.connect(guild, channelId);
      } catch (err) {
        console.error(`❌ Gagal reconnect ke stage di guild ${guild.id}:`, err.message);
        this.scheduleReconnect(guild, channelId);
      }
    }, 10_000);

    pendingRetries.set(guild.id, timer);
  },
};
