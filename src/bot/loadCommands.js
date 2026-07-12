const fs = require('fs');
const path = require('path');

/**
 * Load all command modules from src/bot/commands into a Map keyed by command name.
 */
function loadCommands() {
  const commands = new Map();
  const commandsDir = path.join(__dirname, 'commands');

  for (const file of fs.readdirSync(commandsDir)) {
    if (!file.endsWith('.js')) continue;
    const command = require(path.join(commandsDir, file));
    if (command?.data?.name) {
      commands.set(command.data.name, command);
    }
  }

  return commands;
}

module.exports = { loadCommands };
