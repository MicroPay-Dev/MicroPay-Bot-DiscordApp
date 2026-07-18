const { ActivityType } = require('discord.js');

function formatUptime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}h ${hours}j`;
  if (hours > 0) return `${hours}j ${minutes}m`;
  return `${minutes}m`;
}

function buildStatuses(client) {
  const guildCount = client.guilds.cache.size;
  const memberCount = client.guilds.cache.reduce((sum, g) => sum + (g.memberCount || 0), 0);
  const uptime = formatUptime(client.uptime || 0);

  return [
    { name: `${guildCount} server`, type: ActivityType.Watching },
    { name: `${memberCount} member`, type: ActivityType.Listening },
    { name: `/dashboard`, type: ActivityType.Playing },
    { name: `uptime ${uptime}`, type: ActivityType.Watching },
  ];
}

module.exports = {
  /**
   * Rotates the bot's presence/status (shown under its name in the member
   * list) through a few live stats every `intervalSeconds`, so the server
   * can see at a glance how many servers/members the bot is serving and how
   * long it's been up, instead of a single static status.
   */
  startRotating(client, intervalSeconds = 20) {
    let index = 0;

    const update = () => {
      const statuses = buildStatuses(client);
      const status = statuses[index % statuses.length];
      client.user.setPresence({ activities: [status], status: 'online' });
      index += 1;
    };

    update();
    setInterval(update, intervalSeconds * 1000);

    console.log(`✅ Bot presence rotation started (every ${intervalSeconds}s)`);
  },
};
