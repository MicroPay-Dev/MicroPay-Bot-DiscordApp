const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-support-panel')
    .setDescription('Pasang panel "Buka Ticket Support" permanen di channel ini')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) =>
      o.setName('judul').setDescription('Judul panel (opsional)').setRequired(false)
    )
    .addStringOption((o) =>
      o.setName('deskripsi').setDescription('Deskripsi panel (opsional)').setRequired(false)
    ),

  async execute(interaction) {
    const title = interaction.options.getString('judul') || '🎫 MicroStore - Support';
    const description =
      interaction.options.getString('deskripsi') ||
      'Butuh bantuan? Klik tombol di bawah untuk membuka ticket support pribadi dengan tim kami.';

    const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(0x2ecc71);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('support_panel_create_ticket')
        .setLabel('Buka Ticket Support')
        .setEmoji('🎫')
        .setStyle(ButtonStyle.Success)
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: '✅ Panel support berhasil dipasang di channel ini.', ephemeral: true });
  },
};
