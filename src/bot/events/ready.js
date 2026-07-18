const { REST, Routes } = require('discord.js');
const YouTubeService = require('../../services/YouTubeService');
const BackupService = require('../../services/BackupService');
const BumpReminderService = require('../../services/BumpReminderService');
const QuestFeedService = require('../../services/QuestFeedService');
const PresenceService = require('../../services/PresenceService');
const StageService = require('../../services/StageService');
const settingsRepo = require('../../repositories/settingsRepo');

// Re-registers all global slash commands on every boot, using whatever
// command files currently exist in src/bot/commands (already loaded into
// client.commands by src/bot/client.js). This means pushing a new/changed
// command to GitHub + a Railway redeploy is enough to sync it to Discord —
// no need to run deploy-commands.js manually (which requires a full local
// npm install, including native modules that don't build on Termux/Android).
async function syncSlashCommands(client) {
  try {
    const commands = [...client.commands.values()].map((c) => c.data.toJSON());
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    // If this application has an Activity (Embedded App) "Entry Point"
    // command registered in the Developer Portal, Discord requires it to be
    // included in every bulk overwrite of global commands, or the PUT is
    // rejected outright. Fetch whatever's currently live and preserve it.
    const existing = await rest.get(Routes.applicationCommands(process.env.CLIENT_ID));
    const entryPoint = existing.find((c) => c.type === 4);
    const body = entryPoint ? [...commands, entryPoint] : commands;

    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body });
    console.log(`✅ Slash commands synced (${commands.length} commands)`);
  } catch (err) {
    console.error('❌ Gagal sync slash commands:', err.message);
  }
}

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    console.log(`✅ MICROSTORE logged in as ${client.user.tag}`);

    await syncSlashCommands(client);
    
    // Start YouTube monitoring polling (check every 10 minutes)
    YouTubeService.startPolling(client, 10);

    // Start automatic database backup (every 24 hours, keep last 14)
    BackupService.startScheduledBackup(client, 24, 14);

    // Start /bump reminder scheduler (every 2 hours, if enabled per-guild)
    BumpReminderService.startReminder(client);

    // Start Discord Quest auto-feed scheduler (every 1 hour, if enabled per-guild)
    QuestFeedService.startPolling(client);

    // Rotate bot status (server count, member count, uptime) every 20s
    PresenceService.startRotating(client, 20);

    // Re-join any Stage Channels configured per-guild, so a bot restart
    // (e.g. Railway redeploy) doesn't leave the bot missing from the stage.
    for (const guild of client.guilds.cache.values()) {
      const settings = settingsRepo.get(guild.id);
      if (settings?.stage_enabled && settings?.stage_channel) {
        try {
          StageService.connect(guild, settings.stage_channel);
        } catch (err) {
          console.error(`❌ Gagal auto-rejoin stage di guild ${guild.id}:`, err.message);
        }
      }
    }
  },
};
