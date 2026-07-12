const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const AnalyticsService = require('../../services/AnalyticsService');

function formatRupiah(n) {
  return `Rp${Number(n || 0).toLocaleString('id-ID')}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('analytics')
    .setDescription('Lihat statistik toko (revenue, orders, produk terlaris)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guild.id;
    const summary = AnalyticsService.getSummary(guildId);
    const recentSales = AnalyticsService.getRecentSales(guildId, 5);

    const statusLine = summary.ordersByStatus.length
      ? summary.ordersByStatus.map((s) => `${s.status}: **${s.count}**`).join(' • ')
      : 'Belum ada order';

    const topProductsLine = summary.topProducts.length
      ? summary.topProducts
          .map((p, i) => `${i + 1}. **${p.name}** — ${p.orders_count} order, ${formatRupiah(p.revenue)}`)
          .join('\n')
      : 'Belum ada data penjualan';

    const recentSalesLine = recentSales.length
      ? recentSales
          .map((s) => `<@${s.user_id}> • **${s.product_name}** • ${formatRupiah(s.amount)}`)
          .join('\n')
      : 'Belum ada penjualan';

    const embed = new EmbedBuilder()
      .setTitle('📊 Store Analytics')
      .setColor(0x38a169)
      .addFields(
        { name: '💰 Total Revenue', value: formatRupiah(summary.totalRevenue), inline: true },
        { name: '✅ Approved Payments', value: String(summary.approvedPayments), inline: true },
        { name: '🧾 Total Orders', value: String(summary.totalOrders), inline: true },
        { name: '👥 Unique Buyers', value: String(summary.uniqueBuyers), inline: true },
        { name: '📈 Avg. Order Value', value: formatRupiah(summary.avgOrderValue), inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: '📦 Orders by Status', value: statusLine },
        { name: '🏆 Top Products', value: topProductsLine },
        { name: '🕒 Recent Sales', value: recentSalesLine }
      )
      .setFooter({ text: `Guild: ${interaction.guild.name}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
