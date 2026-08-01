const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-catalog-panel')
    .setDescription('Pasang panel katalog (Pilih Kategori Produk / Pilih Produk untuk Dibeli) di channel ini')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) => o.setName('judul').setDescription('Judul panel (opsional)').setRequired(false))
    .addStringOption((o) => o.setName('deskripsi').setDescription('Deskripsi panel (opsional)').setRequired(false)),

  async execute(interaction) {
    const title = interaction.options.getString('judul') || '🛒 Katalog MICROSTORE';
    const description =
      interaction.options.getString('deskripsi') ||
      'Klik **Pilih Kategori Produk** untuk lihat info produk kami, atau langsung klik **Pilih Produk untuk Dibeli** untuk order.';

    const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(0x5865f2);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('catalog_browse_products').setLabel('📦 PILIH KATEGORI PRODUK').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('catalog_browse_variants').setLabel('🛒 PILIH PRODUK UNTUK DIBELI').setStyle(ButtonStyle.Primary)
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: '✅ Panel katalog berhasil dipasang di channel ini.', ephemeral: true });
  },
};
