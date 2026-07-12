const fs = require('fs');
const path = require('path');

const interactionsDir = path.join(__dirname, '..', 'interactions');
const staticHandlers = new Map();
const dynamicHandlers = [];

for (const file of fs.readdirSync(interactionsDir)) {
  if (!file.endsWith('.js')) continue;
  const handler = require(path.join(interactionsDir, file));
  if (handler.customId) {
    staticHandlers.set(handler.customId, handler);
  } else if (handler.matches) {
    dynamicHandlers.push(handler);
  }
}

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;
        await command.execute(interaction);
        return;
      }

      if (interaction.isAutocomplete()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command || !command.autocomplete) return;
        await command.autocomplete(interaction);
        return;
      }

      if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) {
        const handler =
          staticHandlers.get(interaction.customId) ||
          dynamicHandlers.find((h) => h.matches(interaction.customId));

        if (handler) {
          await handler.execute(interaction);
        }
      }
    } catch (err) {
      console.error('Interaction error:', err);
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '⚠️ Terjadi error saat memproses aksi ini.', ephemeral: true }).catch(() => {});
      }
    }
  },
};
