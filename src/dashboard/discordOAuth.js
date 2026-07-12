const DISCORD_API = 'https://discord.com/api/v10';

function getRedirectUri() {
  const base = process.env.APP_BASE_URL;
  if (!base) {
    throw new Error(
      'APP_BASE_URL is not set. Set it to your public app URL (e.g. https://yourapp.up.railway.app) for Discord OAuth2 to work.'
    );
  }
  return `${base.replace(/\/$/, '')}/auth/callback`;
}

function getAuthorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: 'identify guilds',
    state,
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

async function exchangeCodeForToken(code) {
  const body = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: getRedirectUri(),
  });

  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord token exchange failed (${res.status}): ${text}`);
  }

  return res.json(); // { access_token, token_type, expires_in, refresh_token, scope }
}

async function fetchDiscordUser(accessToken) {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch Discord user (${res.status})`);
  return res.json(); // { id, username, avatar, ... }
}

/**
 * Returns the guilds the logged-in user is a member of, including their
 * permissions bitfield *in that guild* (Discord includes this directly in
 * the /users/@me/guilds response — no extra bot-side lookup needed for the
 * permission check itself).
 */
async function fetchUserGuilds(accessToken) {
  const res = await fetch(`${DISCORD_API}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch user guilds (${res.status})`);
  return res.json(); // [{ id, name, icon, owner, permissions, ... }]
}

const MANAGE_GUILD_BIT = BigInt(0x20);
const ADMINISTRATOR_BIT = BigInt(0x8);

function hasManagePermission(permissionsString) {
  const perms = BigInt(permissionsString);
  return (perms & MANAGE_GUILD_BIT) === MANAGE_GUILD_BIT || (perms & ADMINISTRATOR_BIT) === ADMINISTRATOR_BIT;
}

module.exports = {
  getAuthorizeUrl,
  exchangeCodeForToken,
  fetchDiscordUser,
  fetchUserGuilds,
  hasManagePermission,
};
