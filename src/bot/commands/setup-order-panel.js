const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-order-panel')
    .setDescription('Pasang panel "Buat Pesanan" permanen di channel ini')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) =>
      o.setName('judul').setDescription('Judul panel (opsional)').setRequired(false)
    )
    .addStringOption((o) =>
      o.setName('deskripsi').setDescription('Deskripsi panel (opsional)').setRequired(false)
    ),

  async execute(interaction) {
    const title = interaction.options.getString('judul') || '🛒 MicroStore - Buat Pesanan';
    const description =
      interaction.options.getString('deskripsi') ||
      'Klik tombol di bawah untuk membuat ticket order pribadi.\nDi dalam ticket, kamu bisa pilih produk dan jumlah yang ingin dibeli.';

    const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(0x5865f2);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('order_panel_create_ticket')
        .setLabel('Buat Pesanan')
        .setEmoji('🛒')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: '✅ Panel order berhasil dipasang di channel ini.', ephemeral: true });
  },
};
