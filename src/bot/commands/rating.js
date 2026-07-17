const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const orderRepo = require('../../repositories/orderRepo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rating')
    .setDescription('Kirim form rating ke buyer lewat DM')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((o) => o.setName('user').setDescription('Buyer yang akan diminta rating').setRequired(true)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');

    // Link to the buyer's most recent order in this server if one exists, so
    // the testimonial embed posted later can show the real product name.
    // Otherwise fall back to a synthetic (still-unique) ID so the existing
    // rating button/modal flow still works exactly the same way.
    const latestOrder = orderRepo.getLatestByUser(interaction.guild.id, targetUser.id);
    const orderId = latestOrder ? latestOrder.id : Date.now();

    const row = new ActionRowBuilder().addComponents(
      [1, 2, 3, 4, 5].map((n) =>
        new ButtonBuilder()
          .setCustomId(`rating_${interaction.guild.id}_${n}_${orderId}`)
          .setLabel('⭐'.repeat(n))
          .setStyle(ButtonStyle.Secondary)
      )
    );

    const embed = new EmbedBuilder()
      .setTitle('⭐ Beri Rating Untuk Kami')
      .setDescription(
        `Halo! Terima kasih sudah berbelanja di **${interaction.guild.name}**.\nBoleh minta waktu sebentar untuk kasih rating pelayanan kami?`
      )
      .setColor(0xf6c90e);

    await interaction.deferReply({ ephemeral: true });

    try {
      await targetUser.send({ embeds: [embed], components: [row] });
      await interaction.editReply({ content: `✅ Form rating berhasil dikirim lewat DM ke ${targetUser}.` });
    } catch (err) {
      // DMs closed — fall back to posting in the current channel instead,
      // so the request still reaches the buyer somehow.
      await interaction.channel.send({ content: `<@${targetUser.id}>`, embeds: [embed], components: [row] });
      await interaction.editReply({
        content: `⚠️ DM ${targetUser} tertutup, jadi form rating dikirim di channel ini sebagai gantinya.`,
      });
    }
  },
};
