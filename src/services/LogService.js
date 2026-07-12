const logRepo = require('../repositories/logRepo');
const settingsRepo = require('../repositories/settingsRepo');

const AUTO_DELETE_MS = 2 * 60 * 1000; // 2 minutes

module.exports = {
  /**
   * Record a log entry in DB and mirror it to the configured log channel (if set).
   * The mirrored message in the log channel auto-deletes after 2 minutes to keep
   * the channel clean; the entry itself stays saved permanently in the database.
   */
  async log(guild, type, message) {
    logRepo.add(guild.id, type, message);

    const settings = settingsRepo.get(guild.id);
    if (settings && settings.log_channel) {
      const channel = guild.channels.cache.get(settings.log_channel);
      if (channel) {
        const sent = await channel
          .send({
            content: `**[${type.toUpperCase()}]** ${message}\n-# 🕑 Pesan ini akan terhapus otomatis dalam 2 menit.`,
          })
          .catch(() => null);

        if (sent) {
          setTimeout(() => sent.delete().catch(() => {}), AUTO_DELETE_MS);
        }
      }
    }
  },
};
