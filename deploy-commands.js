const { REST, Routes } = require('discord.js');
const { clientId, guildId } = require('./config.json'); // Sem puxar o token daqui
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    commands.push(command.data.toJSON());
}

// Puxa o Token de forma protegida
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`Atualizando ${commands.length} comandos de barra (/).`);
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
        console.log('Comandos registrados com sucesso!');
    } catch (error) {
        console.error(error);
    }
})();
