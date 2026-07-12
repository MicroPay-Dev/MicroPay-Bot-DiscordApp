# Dashboard modules

Status: Phase 2 — DONE (v0.9.0).

- Discord OAuth2 login (`src/dashboard/authRoutes.js`, `discordOAuth.js`, `session.js`)
- Cyberpunk-themed frontend in `public/` (`index.html` = login, `dashboard.html` = app shell,
  `js/app.js` = view logic, `css/theme.css` = design tokens)
- Product Manager UI, Settings UI, Analytics, YouTube manager, Orders/Payments viewer,
  Logs & Transcripts viewer, Backups manager — all in the single-page dashboard app
- Backend API in `dashboardApi.js`, gated by session + per-guild Manage Server permission check

## Required env vars for OAuth2 to work
- `CLIENT_ID`, `CLIENT_SECRET` — from Discord Developer Portal (OAuth2 tab)
- `APP_BASE_URL` — your public app URL, e.g. `https://yourapp.up.railway.app`
  (must also be added as a Redirect URL in the Discord Developer Portal, exactly:
  `<APP_BASE_URL>/auth/callback`)
- `SESSION_SECRET` — any long random string

## Known limitation
Sessions are stored in-memory (no extra DB/Redis dependency was added to keep
`npm install` simple). This means: (a) logging out the bot process clears all
dashboard sessions, and (b) this will not work correctly if this service is
ever scaled to multiple instances. Fine for a single Railway instance.

