const { Events, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config.json');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        // Se for um comando de barra (/)
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'Houve um erro ao executar esse comando!', ephemeral: true });
            }
        }

        // Se for uma interação com os botões
        if (interaction.isButton()) {
            const { guild, user, customId } = interaction;

            if (customId === 'btn_fechar_ticket') {
                await interaction.reply("🔒 Este canal será deletado em 5 segundos...");
                return setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
            }

            let nomeCanal = "";
            let cargoAcessoId = "";
            let embedTicket = new EmbedBuilder();
            let mencaoCargo = "";

            if (customId === 'btn_corregedoria') {
                nomeCanal = `⚖️-corregedoria-${user.username}`;
                cargoAcessoId = config.idCargoCorregedor;
                mencaoCargo = `<@&${config.idCargoCorregedor}>`;

                embedTicket
                    .setTitle("⚖️ CORREGEDORIA GERAL DA CIDADE")
                    .setDescription(`Olá ${user}, preencha o formulário:\n\n• Seu Passaporte (ID):\n• Nome/ID do Policial Envolvido:\n• Relato do ocorrido:\n• Link de Provas (Vídeo):`)
                    .setColor(0xff0000);
            }

            if (customId === 'btn_revogacao') {
                nomeCanal = `📝-revogacao-${user.username}`;
                cargoAcessoId = config.idCargoStaff;
                mencaoCargo = `<@&${config.idCargoStaff}>`;

                embedTicket
                    .setTitle("📝 PEDIDO DE REVOGAÇÃO DE PUNIÇÃO")
                    .setDescription(`Olá ${user}, conteste sua punição aqui:\n\n• Seu Passaporte (ID):\n• Qual punição quer retirar?:\n• Motivo/Justificativa comercial:`)
                    .setColor(0x0000ff);
            }

            if (nomeCanal) {
                const overwrites = [
                    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                    { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ];

                if (guild.roles.cache.has(cargoAcessoId)) {
                    overwrites.push({ id: cargoAcessoId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
                }

                const canalCriado = await guild.channels.create({
                    name: nomeCanal,
                    type: 0,
                    permissionOverwrites: overwrites
                });

                await interaction.reply({ content: `✅ Canal criado em ${canalCriado}`, ephemeral: true });

                const rowFechar = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('btn_fechar_ticket').setLabel('🔒 Fechar Ticket').setStyle(ButtonStyle.Secondary)
                );

                await canalCriado.send({ content: mencaoCargo, embeds: [embedTicket], components: [rowFechar] });
            }
        }
    },
};
