const reactionRoleRepo = require('../../repositories/reactionRoleRepo');

module.exports = {
  name: 'messageReactionRemove',
  once: false,
  async execute(reaction, user) {
    if (user.bot) return;

    try {
      if (reaction.partial) await reaction.fetch();
      if (reaction.message.partial) await reaction.message.fetch();
    } catch {
      return;
    }

    const mapping = reactionRoleRepo.findMapping(reaction.message.id, reaction.emoji.name, reaction.emoji.id);
    if (!mapping) return;

    const guild = reaction.message.guild;
    if (!guild) return;

    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    const role = guild.roles.cache.get(mapping.role_id);
    if (!role) return;

    await member.roles.remove(role).catch(() => {});
  },
};
