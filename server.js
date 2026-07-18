require('dotenv').config();
const path = require('path');
const express = require('express');
const { createClient } = require('./src/bot/client');
const { PermissionsBitField } = require('discord.js');
const StageService = require('./src/services/StageService');
const dashboardApi = require('./src/dashboard/dashboardApi');
const { sessionMiddleware } = require('./src/dashboard/session');
const createAuthRouter = require('./src/dashboard/authRoutes');

const requiredEnv = ['DISCORD_TOKEN'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing required ENV: ${key}`);
    process.exit(1);
  }
}

const app = express();
const port = process.env.PORT || 3000;

const client = createClient();

app.use(sessionMiddleware);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/auth', createAuthRouter(client));
app.use('/api/dashboard', dashboardApi);

dashboardApi.setClient(client);

// Public bot invite link — builds the Discord OAuth2 authorize URL with the
// permissions MICROSTORE BOT needs (tickets, roles, welcome/verify, etc).
// Kept server-side so it's always correct even if CLIENT_ID changes.
app.get('/invite', (req, res) => {
  if (!process.env.CLIENT_ID) {
    return res.status(500).send('CLIENT_ID belum diset di environment variables.');
  }

  const permissions = new PermissionsBitField([
    'ViewChannel',
    'SendMessages',
    'EmbedLinks',
    'AttachFiles',
    'ReadMessageHistory',
    'AddReactions',
    'ManageMessages',
    'ManageChannels',
    'ManageRoles',
    'UseExternalEmojis',
  ]).bitfield.toString();

  const params = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    permissions,
    scope: 'bot applications.commands',
  });

  res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
});

const httpServer = app.listen(port, () => {
  console.log(`HTTP server listening on ${port}`);
});

client.login(process.env.DISCORD_TOKEN);

async function shutdown(signal) {
  console.log(`Received ${signal}`);
  try {
    // Tear down voice/stage connections and their reconnect timers FIRST —
    // otherwise they can keep the process alive past Railway's grace
    // period, causing a forced kill instead of a clean exit.
    StageService.disconnectAll();
    await client.destroy();
    httpServer.close(() => process.exit(0));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
