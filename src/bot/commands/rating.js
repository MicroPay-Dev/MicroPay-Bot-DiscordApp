const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const RATING_PRODUCTS = require('../../utils/ratingProducts');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rating')
    .setDescription('Kirim form rating ke buyer lewat DM')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((o) => o.setName('user').setDescription('Buyer yang akan diminta rating').setRequired(true))
    .addStringOption((o) =>
      o
        .setName('produk')
        .setDescription('Produk yang dibeli')
        .setRequired(true)
        .addChoices(...RATING_PRODUCTS.map((name, i) => ({ name, value: String(i) })))
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const productIndex = interaction.options.getString('produk');
    const productName = RATING_PRODUCTS[Number(productIndex)] || 'Produk';

    // Product token embedded in the customId chain (button -> modal) so the
    // buyer's form never needs to ask them what they bought — Micro already
    // told us via the command itself.
    const row = new ActionRowBuilder().addComponents(
      [1, 2, 3, 4, 5].map((n) =>
        new ButtonBuilder()
          .setCustomId(`rating_${interaction.guild.id}_${n}_${Date.now()}_${productIndex}`)
          .setLabel('⭐'.repeat(n))
          .setStyle(ButtonStyle.Secondary)
      )
    );

    const embed = new EmbedBuilder()
      .setTitle('⭐ Beri Rating Untuk Kami')
      .setDescription(
        `Halo! Terima kasih sudah berbelanja di **${interaction.guild.name}**.\nBoleh minta waktu sebentar untuk kasih rating pelayanan kami?`
      )
      .addFields({ name: '📦 Produk', value: productName })
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
