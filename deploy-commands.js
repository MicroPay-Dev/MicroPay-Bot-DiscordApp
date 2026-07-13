require('dotenv').config();

const { REST, Routes } = require('discord.js');
const { loadCommands } = require('./src/bot/loadCommands');

const commands = [...loadCommands().values()].map(command =>
  command.data.toJSON()
);

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Registering ${commands.length} commands...`);

    await rest.put(
Routes.applicationCommands(
  process.env.CLIENT_ID
),
      ),
      { body: commands }
    );

    console.log('✅ Slash commands registered successfully.');
  } catch (error) {
    console.error(error);
  }
})();
