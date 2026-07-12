const productRepo = require('../repositories/productRepo');
const JokiQuestService = require('./JokiQuestService');
const AutoQuestVipService = require('./AutoQuestVipService');
const WebPanelService = require('./WebPanelService');

module.exports = {
  addProduct(guildId, data) {
    return productRepo.add(guildId, data);
  },

  listProducts(guildId) {
    return productRepo.listActive(guildId);
  },

  getProduct(id) {
    return productRepo.getById(id);
  },

  /**
   * Disable (soft-delete) a product so it no longer appears in listings/order panel.
   * Returns the product that was disabled, or null if it doesn't exist / belongs to another guild.
   */
  disableProduct(guildId, productId) {
    const product = productRepo.getById(productId);
    if (!product || product.guild_id !== guildId) return null;
    productRepo.disable(productId);
    return product;
  },

  /**
   * Deliver the purchased product to the buyer inside the order channel.
   * Branches by product.type:
   *  - joki_quest      -> sends the multi-step Joki Quest form (Username/UID/Target/Email/Password/Catatan)
   *  - auto_quest_vip  -> sends the configured VIP zip file directly
   *  - web_panel       -> sends the multi-step Web Panel form (Nama Website/Brand/Domain/Deskripsi/Fitur/Catatan)
   *  - general (default) -> sends the static delivery_content text configured via /product-add
   */
  async deliver(channel, product, order) {
    switch (product.type) {
      case 'joki_quest':
        return JokiQuestService.startForm(channel, product, order);
      case 'auto_quest_vip':
        return AutoQuestVipService.deliver(channel, product, order);
      case 'web_panel':
        return WebPanelService.startForm(channel, product, order);
      default: {
        const content = product.delivery_content || 'Admin belum mengatur konten delivery untuk produk ini.';
        return channel.send({ content: `📦 **Product Delivery: ${product.name}**\n${content}` });
      }
    }
  },
};
