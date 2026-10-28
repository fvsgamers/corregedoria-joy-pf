const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds // Mantém apenas a permissão essencial de servidores
    ]
});

client.commands = new Collection();

// Handler de Comandos
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    }
}

// Handler de Eventos
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

const tokenFinal = process.env.DISCORD_TOKEN;

if (!tokenFinal || tokenFinal.trim() === "" || tokenFinal.includes("SEU_TOKEN_AQUI")) {
    console.error("\n========================================================");
    console.error("❌ ERRO DE CONFIGURAÇÃO DE SEGURANÇA DETECTADO");
    console.error("👉 A variável 'DISCORD_TOKEN' está vazia ou inacessível.");
    console.error("👉 Certifique-se de configurar a ENV no painel da Discloud.");
    console.error("========================================================\n");
    process.exit(1); 
} else {
    // Remove possíveis quebras de linha acidentais introduzidas no painel
    client.login(tokenFinal.trim());
}
