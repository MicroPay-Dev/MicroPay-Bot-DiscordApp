const { StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const catalogProductRepo = require('../../repositories/catalogProductRepo');
const catalogVariantRepo = require('../../repositories/catalogVariantRepo');

function switchButtonsRow(currentMode) {
  // Lets the user flip between "browse info" and "buy" without ever
  // needing to click the original public panel buttons again — both
  // switch buttons just editReply() the SAME ephemeral session message.
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('catalog_switch_to_browse')
      .setLabel('📦 Lihat Kategori Produk')
      .setStyle(currentMode === 'browse' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(currentMode === 'browse'),
    new ButtonBuilder()
      .setCustomId('catalog_switch_to_buy')
      .setLabel('🛒 Pilih Produk untuk Dibeli')
      .setStyle(currentMode === 'buy' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(currentMode === 'buy')
  );
}

function buildBrowseUI(guildId) {
  const products = catalogProductRepo.listActive(guildId);

  if (!products.length) {
    return { content: '⚠️ Belum ada produk yang tersedia saat ini.', embeds: [], components: [switchButtonsRow('browse')] };
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId('catalog_select_product_info')
    .setPlaceholder('Pilih produk untuk lihat deskripsinya')
    .addOptions(products.slice(0, 25).map((p) => ({ label: p.name, value: String(p.id) })));

  return {
    content: 'Pilih produk di bawah untuk melihat deskripsinya:',
    embeds: [],
    components: [new ActionRowBuilder().addComponents(menu), switchButtonsRow('browse')],
  };
}

function buildBuyUI(guildId) {
  const variants = catalogVariantRepo.listActiveByGuild(guildId);

  if (!variants.length) {
    return { content: '⚠️ Belum ada produk yang bisa dibeli saat ini.', embeds: [], components: [switchButtonsRow('buy')] };
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId('catalog_select_variant_buy')
    .setPlaceholder('Pilih varian yang ingin dibeli')
    .addOptions(
      variants.slice(0, 25).map((v) => ({
        label: `${v.product_name} - ${v.name}`,
        description: `Rp${v.price.toLocaleString('id-ID')}`,
        value: String(v.id),
      }))
    );

  return {
    content: 'Pilih varian yang ingin kamu beli:',
    embeds: [],
    components: [new ActionRowBuilder().addComponents(menu), switchButtonsRow('buy')],
  };
}

module.exports = { switchButtonsRow, buildBrowseUI, buildBuyUI };
