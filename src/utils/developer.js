// Global "developer" identity — separate from per-guild Manage Server
// permissions. Used to gate features that must NEVER be exposed to public
// dashboard users once the bot is invited to other people's servers
// (e.g. full cross-guild database backups, bot profile/avatar editing).
//
// Falls back to a hardcoded ID so this still works even before
// OWNER_DISCORD_ID is set in Railway's Variables tab.
const OWNER_DISCORD_ID = process.env.OWNER_DISCORD_ID || '1041154488267984938';

function isDeveloper(discordUserId) {
  return !!discordUserId && discordUserId === OWNER_DISCORD_ID;
}

module.exports = { OWNER_DISCORD_ID, isDeveloper };
