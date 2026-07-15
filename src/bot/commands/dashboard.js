const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dashboard')
    .setDescription('Buka Web Dashboard MICROSTORE BOT untuk mengatur server ini'),

  async execute(interaction) {
    const baseUrl = (process.env.APP_BASE_URL || '').replace(/\/$/, '');

    if (!baseUrl) {
      await interaction.reply({
        content: '⚠️ Dashboard belum dikonfigurasi oleh developer bot. Coba lagi nanti.',
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('🖥️ MICROSTORE Web Dashboard')
      .setDescription(
        'Kelola server kamu langsung dari browser: Ticket, Verification, Welcome, Announcement, Automation, dan lainnya.\n\nLogin dengan akun Discord kamu untuk mulai mengatur.'
      )
      .setColor(0x5865f2);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Buka Dashboard').setEmoji('🚀').setStyle(ButtonStyle.Link).setURL(`${baseUrl}/dashboard.html`)
    );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  },
};
