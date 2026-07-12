const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Build and send the verification panel (embed + button) into the configured channel,
 * using whatever embed customization is currently saved in settings.
 * Returns the sent message, or null if the channel isn't found.
 */
async function postVerifyPanel(guild, settings) {
  const channel = guild.channels.cache.get(settings.verify_channel);
  if (!channel) return null;

  const embed = new EmbedBuilder()
    .setColor(settings.verify_embed_color ? parseInt(settings.verify_embed_color.replace('#', ''), 16) : 0x57f287)
    .setTitle(settings.verify_embed_title || '✅ Verifikasi Akun')
    .setDescription(
      settings.verify_embed_description || 'Klik tombol di bawah untuk verifikasi akun kamu dan mendapatkan akses penuh ke server.'
    );

  if (settings.verify_image_url) embed.setImage(settings.verify_image_url);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('verify_button').setLabel('✅ Verify Me').setStyle(ButtonStyle.Success)
  );

  return channel.send({ embeds: [embed], components: [row] });
}

module.exports = { postVerifyPanel };
