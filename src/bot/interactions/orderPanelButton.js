const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const TicketService = require('../../services/TicketService');
const ProductService = require('../../services/ProductService');
const settingsRepo = require('../../repositories/settingsRepo');

module.exports = {
  customId: 'order_panel_create_ticket',
  async execute(interaction) {
    await interaction.reply({ content: '⏳ Membuat ticket order kamu...', ephemeral: true });

    const channel = await TicketService.createOrderTicket(interaction.guild, interaction.user);
    const products = ProductService.listProducts(interaction.guild.id);

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('order_close').setLabel('Close Ticket').setStyle(ButtonStyle.Secondary)
    );

    if (!products.length) {
      const settings = settingsRepo.get(interaction.guild.id);
      const message =
        settings?.empty_catalog_message ||
        '⚠️ Belum ada produk yang tersedia saat ini. Hubungi admin untuk info lebih lanjut.';

      await channel.send({
        content: `<@${interaction.user.id}>\n\n${message}`,
        components: [closeRow],
      });
      return;
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId('order_panel_select_product')
      .setPlaceholder('Pilih produk yang ingin dibeli')
      .addOptions(
        products.slice(0, 25).map((p) => ({
          label: p.name,
          description: `Rp${p.price.toLocaleString('id-ID')}`,
          value: String(p.id),
        }))
      );

    const menuRow = new ActionRowBuilder().addComponents(menu);

    await channel.send({
      content: `👋 <@${interaction.user.id}> Selamat datang di order ticket.\n\nSilakan pilih produk yang ingin kamu beli:`,
      components: [menuRow, closeRow],
    });
  },
};
