const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const BuyerService = require('../../services/BuyerService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('give-buyer-role')
    .setDescription('Beri role Buyer secara manual ke member tertentu')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((o) => o.setName('user').setDescription('Member yang akan diberi role Buyer').setRequired(true)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const result = await BuyerService.grantBuyerRole(interaction.guild, targetUser.id);

    if (result.success) {
      await interaction.reply({ content: `✅ Role Buyer berhasil diberikan ke ${targetUser}.`, ephemeral: true });
    } else {
      await interaction.reply({ content: `❌ Gagal: ${result.error}`, ephemeral: true });
    }
  },
};
