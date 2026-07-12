const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const settingsRepo = require('../../repositories/settingsRepo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-welcome')
    .setDescription('Setup welcome channel dan pesan')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((o) => o.setName('channel').setDescription('Channel untuk welcome').setRequired(true))
    .addStringOption((o) =>
      o.setName('message').setDescription('Pesan welcome (gunakan {user} untuk mention, {server} untuk nama server)').setRequired(false)
    )
    .addRoleOption((o) => o.setName('role').setDescription('Role yang diberikan saat member join (opsional)').setRequired(false)),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const message = interaction.options.getString('message') || null;
    const role = interaction.options.getRole('role') || null;

    settingsRepo.setWelcome(interaction.guild.id, channel.id, message, role?.id || null);

    let reply = `✅ Welcome channel diatur ke ${channel}`;
    if (message) reply += `\n📝 Pesan: ${message}`;
    if (role) reply += `\n👤 Role otomatis: ${role}`;

    await interaction.reply({ content: reply, ephemeral: true });
  },
};
