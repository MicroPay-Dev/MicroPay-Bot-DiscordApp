const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const settingsRepo = require('../../repositories/settingsRepo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-buyer-role')
    .setDescription('Setup role yang diberikan otomatis setelah pembayaran disetujui')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addRoleOption((o) => o.setName('role').setDescription('Buyer role').setRequired(true)),

  async execute(interaction) {
    const role = interaction.options.getRole('role');
    settingsRepo.setBuyerRole(interaction.guild.id, role.id);
    await interaction.reply({ content: `✅ Buyer role diatur ke ${role}`, ephemeral: true });
  },
};
