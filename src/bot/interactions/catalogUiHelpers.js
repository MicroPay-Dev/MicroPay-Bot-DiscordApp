const { StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const catalogProductRepo = require('../../repositories/catalogProductRepo');
const catalogVariantRepo = require('../../repositories/catalogVariantRepo');
const settingsRepo = require('../../repositories/settingsRepo');

function mainButtonsRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('catalog_browse_products').setLabel('📦 PILIH KATEGORI PRODUK').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('catalog_browse_variants').setLabel('🛒 PILIH PRODUK UNTUK DIBELI').setStyle(ButtonStyle.Primary)
  );
}

function switchButtonsRow(currentMode) {
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
      .setDisabled(currentMode === 'buy'),
    new ButtonBuilder().setCustomId('catalog_back_to_main').setLabel('⬅️ Kembali').setStyle(ButtonStyle.Secondary)
  );
}

// The ONE shared public panel message reverts to this view after any
// session finishes (e.g. after a ticket is created) or when "Kembali" is
// pressed — reconstructed from the title/description saved when
// /setup-catalog-panel was run, so it always matches what Micro configured.
function buildDefaultPanelUI(guildId) {
  const settings = settingsRepo.get(guildId);
  const title = settings?.catalog_panel_title || '🛒 Katalog MICROSTORE';
  const description =
    settings?.catalog_panel_description ||
    'Klik **Pilih Kategori Produk** untuk lihat info produk kami, atau langsung klik **Pilih Produk untuk Dibeli** untuk order.';

  const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(0x5865f2);

  return { content: '', embeds: [embed], components: [mainButtonsRow()] };
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

module.exports = { mainButtonsRow, switchButtonsRow, buildDefaultPanelUI, buildBrowseUI, buildBuyUI };
