const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const catalogVariantRepo = require('../../repositories/catalogVariantRepo');
const TicketService = require('../../services/TicketService');
const { buildDefaultPanelUI } = require('./catalogUiHelpers');

module.exports = {
  customId: 'catalog_select_variant_buy',
  async execute(interaction) {
    // Ticket creation involves several awaited Discord API calls, so
    // acknowledge immediately (within Discord's 3s window) before doing
    // any of that work.
    await interaction.deferUpdate();

    const variantId = Number(interaction.values[0]);
    const variant = catalogVariantRepo.getById(variantId);

    if (!variant) {
      await interaction.editReply({ content: '⚠️ Varian tidak ditemukan.', embeds: [], components: [] });
      return;
    }

    await interaction.editReply({ content: `⏳ Membuat ticket order untuk <@${interaction.user.id}>...`, embeds: [], components: [] });

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

    // Reset the ONE shared public panel back to its default view — the
    // actual private confirmation is the new ticket channel itself, which
    // Discord already surfaces to the buyer via their channel list.
    await interaction.editReply(buildDefaultPanelUI(interaction.guild.id));
  },
};
