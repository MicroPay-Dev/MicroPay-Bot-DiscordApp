const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const catalogVariantRepo = require('../../repositories/catalogVariantRepo');
const TicketService = require('../../services/TicketService');

module.exports = {
  customId: 'catalog_select_variant_buy',
  async execute(interaction) {
    await interaction.deferUpdate();

    const variantId = Number(interaction.values[0]);
    const variant = catalogVariantRepo.getById(variantId);

    if (!variant) {
      await interaction.editReply({ content: '⚠️ Varian tidak ditemukan.', embeds: [], components: [] });
      return;
    }

    await interaction.editReply({ content: '⏳ Membuat ticket order kamu...', embeds: [], components: [] });

    const channel = await TicketService.createOrderTicket(interaction.guild, interaction.user);

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('order_close').setLabel('Close Ticket').setStyle(ButtonStyle.Secondary)
    );

    await channel.send({
      content:
        `👋 <@${interaction.user.id}> Selamat datang di order ticket.\n\n` +
        `📦 **Produk:** ${variant.product_name}\n` +
        `🏷️ **Varian:** ${variant.name}\n` +
        `💰 **Harga:** Rp${variant.price.toLocaleString('id-ID')}\n\n` +
        `Admin akan segera memproses pesanan kamu di sini.`,
      components: [closeRow],
    });

    // Final state of the SAME ephemeral session — a jump link straight to
    // the new ticket, instead of a brand new separate message.
    const jumpRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Buka Ticket Order').setStyle(ButtonStyle.Link).setURL(channel.url)
    );

    await interaction.editReply({
      content: `✅ Ticket order kamu sudah dibuat: ${channel}`,
      embeds: [],
      components: [jumpRow],
    });
  },
};
