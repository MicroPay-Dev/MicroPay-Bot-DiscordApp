require('dotenv').config();
const path = require('path');
const express = require('express');
const { createClient } = require('./src/bot/client');
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

const httpServer = app.listen(port, () => {
  console.log(`HTTP server listening on ${port}`);
});

client.login(process.env.DISCORD_TOKEN);

async function shutdown(signal) {
  console.log(`Received ${signal}`);
  try {
    await client.destroy();
    httpServer.close(() => process.exit(0));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
