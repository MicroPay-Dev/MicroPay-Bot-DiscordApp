const settingsRepo = require('../repositories/settingsRepo');

module.exports = {
  async grantBuyerRole(guild, userId) {
    const settings = settingsRepo.get(guild.id);
    if (!settings || !settings.buyer_role) return false;

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return false;

    const role = guild.roles.cache.get(settings.buyer_role);
    if (!role) return false;

    await member.roles.add(role).catch(() => null);
    return true;
  },
};
