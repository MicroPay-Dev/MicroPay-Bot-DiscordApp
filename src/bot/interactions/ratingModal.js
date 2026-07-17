const { EmbedBuilder } = require('discord.js');
const ratingRepo = require('../../repositories/ratingRepo');
const settingsRepo = require('../../repositories/settingsRepo');
const orderRepo = require('../../repositories/orderRepo');
const productRepo = require('../../repositories/productRepo');

const STAR_MAP = { 1: '⭐', 2: '⭐⭐', 3: '⭐⭐⭐', 4: '⭐⭐⭐⭐', 5: '⭐⭐⭐⭐⭐' };

module.exports = {
  matches: (customId) => customId.startsWith('rating_modal_'),
  async execute(interaction) {
    const parts = interaction.customId.split('_');
    const guildId = parts[2];
    const stars = parseInt(parts[3]);
    const orderId = parseInt(parts[4]);

    // This modal can be submitted from a DM (e.g. after /rating), where
    // interaction.guild is null — fall back to looking the guild up by the
    // ID embedded in the customId.
    const guild = interaction.guild || interaction.client.guilds.cache.get(guildId);
    if (!guild) {
      return interaction.reply({ content: '⚠️ Server tidak ditemukan (bot mungkin sudah dikeluarkan).', ephemeral: true });
    }

    // Prevent double-rating
    if (ratingRepo.existsByOrder(orderId)) {
      return interaction.reply({ content: '⚠️ Kamu sudah memberi rating untuk order ini.', ephemeral: true });
    }

    const productName = interaction.fields.getTextInputValue('product') || null;
    const comment = interaction.fields.getTextInputValue('comment') || null;
    ratingRepo.add(guild.id, orderId, interaction.user.id, stars, comment);

    await interaction.reply({
      content: `✅ Terima kasih atas rating kamu! **${STAR_MAP[stars]}**\nUlasan kamu sangat berarti bagi kami 🙏`,
      ephemeral: true,
    });

    // Post testimonial embed to configured channel
    const settings = settingsRepo.get(guild.id);
    if (!settings?.rating_channel) return;

    const logChannel = guild.channels.cache.get(settings.rating_channel);
    if (!logChannel) return;

    const order = orderRepo.getById(orderId);
    const product = order ? productRepo.getById(order.product_id) : null;
    const displayProductName = productName || product?.name || `Order #${orderId}`;

    const starColor = stars >= 4 ? 0xf6c90e : stars >= 3 ? 0xffa94d : 0xff6b6b;

    const embed = new EmbedBuilder()
      .setTitle('🏆 TESTIMONI RATING BUYER')
      .setColor(starColor)
      .addFields(
        {
          name: '👤 CUSTOMER',
          value: `<@${interaction.user.id}> (${interaction.user.username})`,
          inline: false,
        },
        {
          name: '📦 PRODUK',
          value: displayProductName,
          inline: false,
        },
        {
          name: '⭐ RATING',
          value: `${STAR_MAP[stars]} **(${stars}/5)**`,
          inline: false,
        }
      );

    if (comment) {
      embed.addFields({ name: '💬 ULASAN', value: `"${comment}"`, inline: false });
    }

    embed.addFields({
      name: '💜 PESAN',
      value: 'Terima kasih sudah berbelanja di **MICROSTORE**! Kepercayaan kamu adalah motivasi kami untuk terus berkembang. Sampai jumpa di order berikutnya! 🛒',
      inline: false,
    });

    if (settings.testimonial_banner_url) {
      embed.setImage(settings.testimonial_banner_url);
    }

    embed.setTimestamp().setFooter({ text: 'MICROSTORE — Terpercaya & Terjangkau' });

    await logChannel.send({ embeds: [embed] }).catch(() => {});
  },
};
