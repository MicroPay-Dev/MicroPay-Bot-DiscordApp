const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { loadCommands } = require('./loadCommands');

function createClient() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessageReactions,
    ],
    // Reactions/messages on posts made before the bot's last restart arrive
    // as "partial" objects — these partials let discord.js fetch the full
    // data on demand instead of silently ignoring the event.
    partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
  });

  client.commands = loadCommands();

  const eventsDir = path.join(__dirname, 'events');
  for (const file of fs.readdirSync(eventsDir)) {
    if (!file.endsWith('.js')) continue;
    const event = require(path.join(eventsDir, file));
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }

  return client;
}

module.exports = { createClient };
