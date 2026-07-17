const settingsRepo = require('../repositories/settingsRepo');
const LogService = require('./LogService');

module.exports = {
  async grantBuyerRole(guild, userId) {
    const settings = settingsRepo.get(guild.id);
    if (!settings || !settings.buyer_role) {
      return { success: false, error: 'Buyer role belum diatur. Gunakan /setup-buyer-role atau Dashboard > Settings.' };
    }

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) {
      return { success: false, error: 'Member tidak ditemukan di server (mungkin sudah keluar).' };
    }

    const role = guild.roles.cache.get(settings.buyer_role);
    if (!role) {
      return { success: false, error: 'Role Buyer yang diatur sudah tidak ada / terhapus di server.' };
    }

    try {
      await member.roles.add(role);
      return { success: true };
    } catch (err) {
      // Most common cause: the bot's own role is positioned BELOW the buyer
      // role in Server Settings > Roles, so Discord silently refuses the
      // assignment. Surface that clearly instead of failing silently.
      const reason = `Gagal assign role Buyer ke <@${userId}>: ${err.message}. Kemungkinan besar role bot MICROSTORE posisinya DI BAWAH role Buyer di urutan Roles server — naikkan posisi role bot lewat Server Settings > Roles.`;
      await LogService.log(guild, 'buyer-role-error', reason).catch(() => {});
      return { success: false, error: reason };
    }
  },
};
