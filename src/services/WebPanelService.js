const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
} = require('discord.js');
const webPanelOrderRepo = require('../repositories/webPanelOrderRepo');
const LogService = require('./LogService');

// 6 fields needed (Nama Website, Nama Brand, Deskripsi, Domain, Fitur Tambahan, Catatan)
// split across two chained modals (Discord limit: 5 inputs per modal).

function buildStep1Modal(webOrderId) {
  return new ModalBuilder()
    .setCustomId(`web_modal_1_${webOrderId}`)
    .setTitle('Form Web Panel (1/2)')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('website_name').setLabel('Nama Website').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('brand_name').setLabel('Nama Brand').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('domain').setLabel('Domain').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('description')
          .setLabel('Deskripsi Website')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      )
    );
}

function buildStep2Modal(webOrderId) {
  return new ModalBuilder()
    .setCustomId(`web_modal_2_${webOrderId}`)
    .setTitle('Form Web Panel (2/2)')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('extra_features')
          .setLabel('Fitur Tambahan (opsional)')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('notes').setLabel('Catatan (opsional)').setStyle(TextInputStyle.Paragraph).setRequired(false)
      )
    );
}

module.exports = {
  async startForm(channel, product, order) {
    const webOrder = webPanelOrderRepo.create(order.id, channel.guild.id, order.user_id);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`web_form_start_${webOrder.id}`)
        .setLabel('📝 Isi Form Web Panel')
        .setStyle(ButtonStyle.Primary)
    );

    await channel.send({
      content: `<@${order.user_id}> Pembayaran disetujui ✅. Mohon isi detail website kamu (tema default: **CYBERPUNK**):`,
      components: [row],
    });

    return webOrder;
  },

  buildStep1Modal,
  buildStep2Modal,

  async handleStep1Submit(interaction, webOrderId) {
    webPanelOrderRepo.saveStep1(webOrderId, {
      websiteName: interaction.fields.getTextInputValue('website_name'),
      brandName: interaction.fields.getTextInputValue('brand_name'),
      domain: interaction.fields.getTextInputValue('domain'),
      description: interaction.fields.getTextInputValue('description'),
    });

    await interaction.showModal(buildStep2Modal(webOrderId));
  },

  async handleStep2Submit(interaction, webOrderId) {
    webPanelOrderRepo.saveStep2(webOrderId, {
      extraFeatures: interaction.fields.getTextInputValue('extra_features'),
      notes: interaction.fields.getTextInputValue('notes'),
    });

    const data = webPanelOrderRepo.getById(webOrderId);

    await interaction.reply({ content: '✅ Form Web Panel berhasil dikirim ke admin.', ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle('🌐 Data Web Panel Diterima')
      .setColor(0xff00ff)
      .addFields(
        { name: 'Nama Website', value: data.website_name || '-', inline: true },
        { name: 'Nama Brand', value: data.brand_name || '-', inline: true },
        { name: 'Domain', value: data.domain || '-', inline: true },
        { name: 'Tema', value: data.theme || 'CYBERPUNK', inline: true },
        { name: 'Deskripsi', value: data.description || '-' },
        { name: 'Fitur Tambahan', value: data.extra_features || '-' },
        { name: 'Catatan', value: data.notes || '-' }
      );

    await interaction.channel.send({ embeds: [embed] });
    await LogService.log(interaction.guild, 'order', `Web Panel order #${webOrderId} form submitted oleh <@${data.user_id}>`);
  },
};
