const { REST, Routes } = require('discord.js');
const YouTubeService = require('../../services/YouTubeService');
const BackupService = require('../../services/BackupService');
const BumpReminderService = require('../../services/BumpReminderService');
const QuestFeedService = require('../../services/QuestFeedService');

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
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
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
  },
};
