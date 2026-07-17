const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const orderRepo = require('../repositories/orderRepo');
const paymentRepo = require('../repositories/paymentRepo');
const settingsRepo = require('../repositories/settingsRepo');
const productRepo = require('../repositories/productRepo');
const BuyerService = require('./BuyerService');
const ProductService = require('./ProductService');
const LogService = require('./LogService');

module.exports = {
  /**
   * Step 1 (QRIS): ORDER -> create order + payment record, display QRIS in the order channel.
   */
  async startOrder(channel, user, productId, quantity = 1) {
    const guild = channel.guild;
    const product = productRepo.getById(productId);
    if (!product) {
      await channel.send('❌ Produk tidak ditemukan.');
      return null;
    }

    const totalPrice = product.price * quantity;
    const order = orderRepo.create(guild.id, user.id, product.id, channel.id, quantity);
    const payment = paymentRepo.create(guild.id, order.id, user.id, totalPrice);
    orderRepo.setStatus(order.id, 'awaiting_proof');

    const settings = settingsRepo.get(guild.id);

    const embed = new EmbedBuilder()
      .setTitle(`🧾 Order: ${product.name}`)
      .setDescription(
        `**Jumlah:** ${quantity}x\n**Harga per unit:** Rp${product.price.toLocaleString('id-ID')}\n**Total:** Rp${totalPrice.toLocaleString('id-ID')}\n\nScan QRIS di bawah lalu upload bukti pembayaran (gambar) di channel ini.`
      )
      .setColor(0x2b6cb0);

    if (settings?.qris_image_url) {
      embed.setImage(settings.qris_image_url);
    }

    await channel.send({ embeds: [embed] });
    await LogService.log(guild, 'payment', `Order #${order.id} dibuat oleh <@${user.id}> untuk produk \"${product.name}\" (qty: ${quantity}, total: Rp${totalPrice.toLocaleString('id-ID')})`);

    return { order, payment, product };
  },

  /**
   * Step 1 (MANUAL): Create order and show Claim button for admin.
   */
  async startOrderManual(channel, user, productId, quantity = 1) {
    const guild = channel.guild;
    const product = productRepo.getById(productId);
    if (!product) {
      await channel.send('❌ Produk tidak ditemukan.');
      return null;
    }

    const totalPrice = product.price * quantity;
    const order = orderRepo.create(guild.id, user.id, product.id, channel.id, quantity);
    const payment = paymentRepo.create(guild.id, order.id, user.id, totalPrice);
    orderRepo.setStatus(order.id, 'awaiting_claim');

    const embed = new EmbedBuilder()
      .setTitle(`🛒 Order Baru: ${product.name}`)
      .setDescription(
        `**Buyer:** <@${user.id}>\n**Jumlah:** ${quantity}x\n**Harga per unit:** Rp${product.price.toLocaleString('id-ID')}\n**Total:** Rp${totalPrice.toLocaleString('id-ID')}\n\nAdmin, klik **Claim** untuk memproses order ini secara manual.`
      )
      .setColor(0xf6ad55);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`order_claim_${order.id}`)
        .setLabel('💳 Claim Order')
        .setStyle(ButtonStyle.Primary)
    );

    await channel.send({ embeds: [embed], components: [row] });
    await LogService.log(guild, 'payment', `Order #${order.id} dibuat oleh <@${user.id}> untuk produk \"${product.name}\" (qty: ${quantity}, total: Rp${totalPrice.toLocaleString('id-ID')})`);

    return { order, payment, product };
  },

  /**
   * Step 2 (MANUAL): Admin claims the order.
   */
  async claimOrder(channel, orderId, admin) {
    const order = orderRepo.getById(orderId);
    if (!order || order.status !== 'awaiting_claim') return null;

    orderRepo.setStatus(order.id, 'claimed');
    const product = productRepo.getById(order.product_id);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`order_complete_${order.id}`)
        .setLabel('✅ Selesai (Kirim Rating ke Buyer)')
        .setStyle(ButtonStyle.Success)
    );

    await channel.send({
      content: `✅ Order #${order.id} di-claim oleh <@${admin.id}>.\n\nKirimkan produk **${product?.name || ''}** ke buyer <@${order.user_id}> di channel ini, lalu klik tombol **Selesai** di bawah jika sudah dikirim.`,
      components: [row],
    });

    await LogService.log(channel.guild, 'payment', `Order #${order.id} di-claim oleh <@${admin.id}>`);
    return order;
  },

  /**
   * Step 3 (MANUAL): Admin marks order as complete → trigger rating form for buyer.
   */
  async completeOrder(channel, orderId, admin) {
    const order = orderRepo.getById(orderId);
    if (!order || order.status !== 'claimed') return null;

    const payment = paymentRepo.getLatestByOrder(order.id);
    if (payment) paymentRepo.approve(payment.id, admin.id);
    orderRepo.setStatus(order.id, 'completed');

    const guild = channel.guild;
    await BuyerService.grantBuyerRole(guild, order.user_id);

    // Send rating prompt in channel
    const ratingRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`rating_${guild.id}_1_${order.id}`).setLabel('⭐').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`rating_${guild.id}_2_${order.id}`).setLabel('⭐⭐').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`rating_${guild.id}_3_${order.id}`).setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`rating_${guild.id}_4_${order.id}`).setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`rating_${guild.id}_5_${order.id}`).setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Primary)
    );

    await channel.send({
      content: `🎉 Order #${order.id} selesai! Role buyer diberikan.\n\n<@${order.user_id}> Terima kasih sudah berbelanja di MICROSTORE! Berikan rating pengalaman kamu:`,
      components: [ratingRow],
    });

    // Also DM the buyer
    try {
      const buyer = await guild.members.fetch(order.user_id);
      await buyer.send({
        content: `🎉 Order kamu di **${guild.name}** sudah selesai! Terima kasih sudah berbelanja.\n\nKembali ke channel order kamu untuk memberikan rating pengalaman belanja kamu 😊\n${channel.url}`,
      }).catch(() => {});
    } catch {}

    await LogService.log(guild, 'payment', `Order #${order.id} COMPLETED oleh <@${admin.id}>`);
    return order;
  },

  /**
   * Step 2 (QRIS): Upload Proof -> called when buyer attaches an image in the order channel.
   */
  async submitProof(channel, attachmentUrl) {
    const order = orderRepo.getByChannel(channel.id);
    if (!order || order.status !== 'awaiting_proof') return null;

    const payment = paymentRepo.getLatestByOrder(order.id);
    if (!payment) return null;

    paymentRepo.attachProof(payment.id, attachmentUrl);
    orderRepo.setStatus(order.id, 'reviewing');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`payment_approve_${payment.id}`)
        .setLabel('Approve')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`payment_reject_${payment.id}`)
        .setLabel('Reject')
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `📥 Bukti pembayaran diterima untuk Order #${order.id}. Menunggu review admin.`,
      components: [row],
    });

    await LogService.log(channel.guild, 'payment', `Bukti pembayaran diupload untuk Order #${order.id}`);

    return { order, payment };
  },

  /**
   * Step 3a (QRIS): Admin Approve -> Give Buyer Role -> Deliver Product.
   */
  async approve(channel, paymentId, reviewer) {
    const payment = paymentRepo.getById(paymentId);
    if (!payment) return null;

    const order = orderRepo.getById(payment.order_id);
    paymentRepo.approve(payment.id, reviewer.id);
    orderRepo.setStatus(order.id, 'completed');

    const guild = channel.guild;
    await BuyerService.grantBuyerRole(guild, payment.user_id);

    const product = productRepo.getById(order.product_id);
    if (product) {
      await ProductService.deliver(channel, product, order);
    }

    // Send rating prompt
    const ratingRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`rating_${guild.id}_1_${order.id}`).setLabel('⭐').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`rating_${guild.id}_2_${order.id}`).setLabel('⭐⭐').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`rating_${guild.id}_3_${order.id}`).setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`rating_${guild.id}_4_${order.id}`).setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`rating_${guild.id}_5_${order.id}`).setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Primary)
    );

    await channel.send({
      content: `✅ Pembayaran Order #${order.id} **disetujui** oleh <@${reviewer.id}>. Role buyer diberikan.\n\n<@${payment.user_id}> Berikan rating pengalaman kamu:`,
      components: [ratingRow],
    });

    // Also DM the buyer
    try {
      const buyer = await guild.members.fetch(payment.user_id);
      await buyer.send({
        content: `🎉 Order kamu di **${guild.name}** sudah disetujui! Terima kasih sudah berbelanja.\n\nKembali ke channel order kamu untuk memberikan rating 😊\n${channel.url}`,
      }).catch(() => {});
    } catch {}

    await LogService.log(guild, 'payment', `Order #${order.id} APPROVED oleh <@${reviewer.id}>`);

    return { order, payment };
  },

  /**
   * Step 3b (QRIS): Admin Reject.
   */
  async reject(channel, paymentId, reviewer) {
    const payment = paymentRepo.getById(paymentId);
    if (!payment) return null;

    const order = orderRepo.getById(payment.order_id);
    paymentRepo.reject(payment.id, reviewer.id);
    orderRepo.setStatus(order.id, 'rejected');

    await channel.send(
      `❌ Pembayaran Order #${order.id} **ditolak** oleh <@${reviewer.id}>. Silakan upload ulang bukti pembayaran yang valid.`
    );
    orderRepo.setStatus(order.id, 'awaiting_proof');

    await LogService.log(channel.guild, 'payment', `Order #${order.id} REJECTED oleh <@${reviewer.id}>`);

    return { order, payment };
  },
};

module.exports = {
  /**
   * Step 1: ORDER -> create order + payment record, display QRIS in the order channel.
   */
  async startOrder(channel, user, productId, quantity = 1) {
    const guild = channel.guild;
    const product = productRepo.getById(productId);
    if (!product) {
      await channel.send('❌ Produk tidak ditemukan.');
      return null;
    }

    const totalPrice = product.price * quantity;
    const order = orderRepo.create(guild.id, user.id, product.id, channel.id, quantity);
    const payment = paymentRepo.create(guild.id, order.id, user.id, totalPrice);
    orderRepo.setStatus(order.id, 'awaiting_proof');

    const settings = settingsRepo.get(guild.id);

    const embed = new EmbedBuilder()
      .setTitle(`🧾 Order: ${product.name}`)
      .setDescription(
        `**Jumlah:** ${quantity}x\n**Harga per unit:** Rp${product.price.toLocaleString('id-ID')}\n**Total:** Rp${totalPrice.toLocaleString('id-ID')}\n\nScan QRIS di bawah lalu upload bukti pembayaran (gambar) di channel ini.`
      )
      .setColor(0x2b6cb0);

    if (settings?.qris_image_url) {
      embed.setImage(settings.qris_image_url);
    }

    await channel.send({ embeds: [embed] });
    await LogService.log(guild, 'payment', `Order #${order.id} dibuat oleh <@${user.id}> untuk produk "${product.name}" (qty: ${quantity}, total: Rp${totalPrice.toLocaleString('id-ID')})`);

    return { order, payment, product };
  },

  /**
   * Step 2: Upload Proof -> called when buyer attaches an image in the order channel.
   */
  async submitProof(channel, attachmentUrl) {
    const order = orderRepo.getByChannel(channel.id);
    if (!order || order.status !== 'awaiting_proof') return null;

    const payment = paymentRepo.getLatestByOrder(order.id);
    if (!payment) return null;

    paymentRepo.attachProof(payment.id, attachmentUrl);
    orderRepo.setStatus(order.id, 'reviewing');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`payment_approve_${payment.id}`)
        .setLabel('Approve')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`payment_reject_${payment.id}`)
        .setLabel('Reject')
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `📥 Bukti pembayaran diterima untuk Order #${order.id}. Menunggu review admin.`,
      components: [row],
    });

    await LogService.log(channel.guild, 'payment', `Bukti pembayaran diupload untuk Order #${order.id}`);

    return { order, payment };
  },

  /**
   * Step 3a: Admin Approve -> Give Buyer Role -> Deliver Product.
   */
  async approve(channel, paymentId, reviewer) {
    const payment = paymentRepo.getById(paymentId);
    if (!payment) return null;

    const order = orderRepo.getById(payment.order_id);
    paymentRepo.approve(payment.id, reviewer.id);
    orderRepo.setStatus(order.id, 'completed');

    const guild = channel.guild;
    await BuyerService.grantBuyerRole(guild, payment.user_id);

    const product = productRepo.getById(order.product_id);
    if (product) {
      await ProductService.deliver(channel, product, order);
    }

    await channel.send(`✅ Pembayaran Order #${order.id} **disetujui** oleh <@${reviewer.id}>. Role buyer diberikan.`);
    await LogService.log(guild, 'payment', `Order #${order.id} APPROVED oleh <@${reviewer.id}>`);

    return { order, payment };
  },

  /**
   * Step 3b: Admin Reject.
   */
  async reject(channel, paymentId, reviewer) {
    const payment = paymentRepo.getById(paymentId);
    if (!payment) return null;

    const order = orderRepo.getById(payment.order_id);
    paymentRepo.reject(payment.id, reviewer.id);
    orderRepo.setStatus(order.id, 'rejected');

    await channel.send(
      `❌ Pembayaran Order #${order.id} **ditolak** oleh <@${reviewer.id}>. Silakan upload ulang bukti pembayaran yang valid.`
    );
    orderRepo.setStatus(order.id, 'awaiting_proof');

    await LogService.log(channel.guild, 'payment', `Order #${order.id} REJECTED oleh <@${reviewer.id}>`);

    return { order, payment };
  },
};
