const { Events, ActivityType } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`🤖 Bot da Corregedoria [${client.user.tag}] está pronto e operando!`);
        
        // Força o status a ficar Online (Verde) e define a atividade no RP
        client.user.setPresence({
            activities: [{ name: '🛡️ Corregedoria Geral', type: ActivityType.Playing }],
            status: 'online', 
        });
    },
};
