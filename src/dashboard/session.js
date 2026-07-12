const crypto = require('crypto');

/**
 * Minimal session layer for Phase 2 Discord OAuth2.
 *
 * Deliberately dependency-free (no express-session / cookie-parser) so this
 * works the moment `npm install` finishes with the existing package.json.
 * Sessions live in memory — fine for a single Railway instance, but note:
 * sessions are lost on restart/redeploy, and this will NOT work correctly
 * if you ever scale this service to multiple instances (would need a
 * shared store like Redis at that point).
 */
const sessions = new Map(); // sessionId -> { discordUser, accessToken, guilds, createdAt }

const SESSION_COOKIE = 'microstore_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret === 'CHANGE_ME') {
    console.warn('⚠️  SESSION_SECRET is not set (or still the example value) — set a real random secret before deploying.');
  }
  return secret || 'dev-insecure-secret-change-me';
}

function sign(value) {
  const hmac = crypto.createHmac('sha256', getSecret()).update(value).digest('hex');
  return `${value}.${hmac}`;
}

function verify(signed) {
  if (!signed || !signed.includes('.')) return null;
  const idx = signed.lastIndexOf('.');
  const value = signed.slice(0, idx);
  const hmac = signed.slice(idx + 1);
  const expected = crypto.createHmac('sha256', getSecret()).update(value).digest('hex');
  // Constant-time compare to avoid timing attacks
  const a = Buffer.from(hmac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return value;
}

function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    out[key] = decodeURIComponent(val);
  }
  return out;
}

function createSession(data) {
  const sessionId = crypto.randomBytes(32).toString('hex');
  sessions.set(sessionId, { ...data, createdAt: Date.now() });
  return sessionId;
}

function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    sessions.delete(sessionId);
    return null;
  }
  return session;
}

function destroySession(sessionId) {
  sessions.delete(sessionId);
}

/**
 * Express middleware: reads the session cookie (if present), validates its
 * signature, and attaches `req.session` (or null) + `req.sessionId`.
 * Does not block the request — route-level guards decide what's required.
 */
function sessionMiddleware(req, res, next) {
  const cookies = parseCookies(req);
  const raw = cookies[SESSION_COOKIE];
  const sessionId = raw ? verify(raw) : null;
  req.sessionId = sessionId;
  req.session = sessionId ? getSession(sessionId) : null;
  next();
}

function setSessionCookie(res, sessionId, isHttps) {
  const signed = sign(sessionId);
  const maxAgeSeconds = Math.floor(SESSION_TTL_MS / 1000);
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(signed)}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
    'SameSite=Lax',
  ];
  if (isHttps) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
}

module.exports = {
  sessionMiddleware,
  createSession,
  getSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
};
