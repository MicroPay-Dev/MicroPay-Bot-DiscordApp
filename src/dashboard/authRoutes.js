const express = require('express');
const crypto = require('crypto');
const oauth = require('./discordOAuth');
const session = require('./session');
const { isDeveloper } = require('../utils/developer');

/**
 * Factory: needs the live Discord client to cross-check which guilds the
 * bot is actually in (a user might manage 10 servers, but we only want to
 * show the ones where this bot is installed).
 */
module.exports = function createAuthRouter(client) {
  const router = express.Router();

  // Short-lived OAuth CSRF state tokens (state -> expiry timestamp)
  const pendingStates = new Map();
  function makeState() {
    const state = crypto.randomBytes(16).toString('hex');
    pendingStates.set(state, Date.now() + 5 * 60 * 1000); // 5 min to complete login
    return state;
  }
  function consumeState(state) {
    const expiry = pendingStates.get(state);
    pendingStates.delete(state);
    return !!expiry && expiry > Date.now();
  }

  router.get('/login', (req, res) => {
    if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
      return res.status(500).send('CLIENT_ID / CLIENT_SECRET belum diset di .env — dashboard login tidak bisa jalan.');
    }
    try {
      const state = makeState();
      res.redirect(oauth.getAuthorizeUrl(state));
    } catch (err) {
      res.status(500).send(err.message);
    }
  });

  router.get('/callback', async (req, res) => {
    const { code, state, error } = req.query;

    if (error) return res.redirect('/?error=' + encodeURIComponent(error));
    if (!code || !state || !consumeState(state)) {
      return res.status(400).send('Login gagal: state tidak valid atau sudah kedaluwarsa. Coba login lagi.');
    }

    try {
      const tokenData = await oauth.exchangeCodeForToken(code);
      const discordUser = await oauth.fetchDiscordUser(tokenData.access_token);
      const userGuilds = await oauth.fetchUserGuilds(tokenData.access_token);

      // Only keep guilds where: (a) this bot is also present, and
      // (b) the user has Manage Server / Administrator there.
      const guilds = userGuilds
        .filter((g) => client.guilds.cache.has(g.id))
        .map((g) => ({
          id: g.id,
          name: g.name,
          icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
          canManage: oauth.hasManagePermission(g.permissions),
        }))
        .filter((g) => g.canManage);

      const sessionId = session.createSession({
        discordUser: { id: discordUser.id, username: discordUser.username, avatar: discordUser.avatar },
        accessToken: tokenData.access_token,
        guilds,
        isDeveloper: isDeveloper(discordUser.id),
      });

      session.setSessionCookie(res, sessionId, req.protocol === 'https');
      res.redirect('/dashboard.html');
    } catch (err) {
      console.error('OAuth callback error:', err);
      res.status(500).send('Login gagal: ' + err.message);
    }
  });

  router.get('/me', (req, res) => {
    if (!req.session) return res.status(401).json({ error: 'Not authenticated' });
    res.json({ user: req.session.discordUser, guilds: req.session.guilds, isDeveloper: !!req.session.isDeveloper });
  });

  router.post('/logout', (req, res) => {
    if (req.sessionId) session.destroySession(req.sessionId);
    session.clearSessionCookie(res);
    res.json({ success: true });
  });

  return router;
};
