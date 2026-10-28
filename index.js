const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Inicializa o cliente sem Intents Privilegiadas (Não precisa ativar MessageContent no Portal)
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
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

// Tratamento e Injeção do Token da Discloud
const tokenSeguro = process.env.DISCORD_TOKEN;

if (!tokenSeguro) {
    console.error("❌ ERRO: A variável DISCORD_TOKEN não foi definida no painel da Discloud.");
    process.exit(1);
} else {
    client.login(tokenSeguro.trim());
}
