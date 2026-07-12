const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const vipFileRepo = require('../repositories/vipFileRepo');
const LogService = require('./LogService');
const { DATA_DIR } = require('../utils/dataDir');

const VIP_DIR = path.join(DATA_DIR, 'uploads', 'vip');

function ensureDir() {
  fs.mkdirSync(VIP_DIR, { recursive: true });
}

module.exports = {
  /**
   * Admin uploads/replaces the VIP delivery file via Discord attachment
   * (temporary flow until the web dashboard's file manager is built in Phase 2).
   */
  async setFileFromAttachment(guildId, attachment, uploadedById) {
    ensureDir();

    const safeName = attachment.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(VIP_DIR, `${guildId}-${safeName}`);

    const response = await fetch(attachment.url);
    if (!response.ok) throw new Error(`Gagal download attachment: ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    return vipFileRepo.set(guildId, filePath, attachment.name, uploadedById);
  },

  getFile(guildId) {
    return vipFileRepo.get(guildId);
  },

  /**
   * Called from ProductService.deliver() right after payment is approved.
   * Sends the configured VIP zip file directly in the (private) order channel.
   */
  async deliver(channel, product, order) {
    const fileRow = vipFileRepo.get(channel.guild.id);

    if (!fileRow || !fs.existsSync(fileRow.file_path)) {
      await channel.send(
        `⚠️ <@${order.user_id}> File Auto Quest VIP belum diatur oleh admin. Mohon hubungi admin untuk mengatur file via \`/vip-set-file\`.`
      );
      return false;
    }

    const fileAttachment = new AttachmentBuilder(fileRow.file_path, { name: fileRow.original_name || 'MicroStore-Auto-Quest-Discord-VIP.zip' });

    await channel.send({
      content: `<@${order.user_id}> Pembayaran disetujui ✅. Berikut file Auto Quest VIP kamu:`,
      files: [fileAttachment],
    });

    await LogService.log(channel.guild, 'order', `Auto Quest VIP file dikirim ke <@${order.user_id}> untuk Order #${order.id}`);
    return true;
  },
};
