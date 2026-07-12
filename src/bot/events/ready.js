const YouTubeService = require('../../services/YouTubeService');
const BackupService = require('../../services/BackupService');
const BumpReminderService = require('../../services/BumpReminderService');

module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`✅ MICROSTORE logged in as ${client.user.tag}`);
    
    // Start YouTube monitoring polling (check every 10 minutes)
    YouTubeService.startPolling(client, 10);

    // Start automatic database backup (every 24 hours, keep last 14)
    BackupService.startScheduledBackup(client, 24, 14);

    // Start /bump reminder scheduler (every 2 hours, if enabled per-guild)
    BumpReminderService.startReminder(client);
  },
};
