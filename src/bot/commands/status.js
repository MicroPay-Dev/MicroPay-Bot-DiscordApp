const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

function formatUptime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}h`);
  if (hours > 0) parts.push(`${hours}j`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}d`);
  return parts.join(' ');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Cek apakah bot MICROSTORE sedang online'),

  async execute(interaction) {
    const client = interaction.client;
    const ping = Math.round(client.ws.ping);
    const uptime = formatUptime(client.uptime || 0);
    const guildCount = client.guilds.cache.size;

    const embed = new EmbedBuilder()
      .setTitle('🟢 MICROSTORE — Online')
      .setColor(0x39ff88)
      .addFields(
        { name: '📡 Ping', value: `${ping}ms`, inline: true },
        { name: '⏱️ Uptime', value: uptime, inline: true },
        { name: '🌐 Melayani', value: `${guildCount} server`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
