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

            // --- TEXTO DE APRESENTAÇÃO: CORREGEDORIA ---
            if (customId === 'btn_corregedoria') {
                nomeCanal = `⚖️-corregedoria-${user.username}`;
                cargoAcessoId = config.idCargoCorregedor;
                mencaoCargo = `<@&${config.idCargoCorregedor}>`;

                embedTicket
                    .setTitle("⚖️ CORREGEDORIA GERAL DA CIDADE")
                    .setDescription(
                        `Prezado(a) cidadão(ã) ${user},\n\n` +
                        `Você está no canal oficial de atendimento da **Corregedoria Geral**. Este espaço é destinado exclusivamente para a apuração de desvios de conduta, abusos de autoridade ou descumprimento de procedimentos institucionais por parte de funcionários públicos e forças policiais.\n\n` +
                        `⚠️ **Garantia de Sigilo:** Nos termos do regimento da cidade, todas as informações aqui registradas são estritamente confidenciais e acessíveis apenas pela mesa de oficiais corregedores.\n\n` +
                        `Para que possamos iniciar os procedimentos de investigação, **envie abaixo as seguintes informações**:`
                    )
                    .addFields(
                        { name: '📋 Formulário de Abertura', value: 
                            `• **Seu Passaporte (ID):**\n` +
                            `• **Nome ou ID do Oficial Envolvido:**\n` +
                            `• **Corporação/Organização:** (Ex: PM, PC, Guardas)\n` +
                            `• **Data, Horário e Local do Fato:**\n` +
                            `• **Relato Detalhado:** (Descreva o que aconteceu)\n` +
                            `• **Link de Provas:** (Vídeo anexado no YouTube, Medal, Streamable, etc.)`
                        },
                        { name: '📢 Orientações', value: `Falsas denúncias, desacato técnico ou ocultação de fatos dentro deste canal resultarão em punições severas na cidade por quebra de regras.` }
                    )
                    .setColor(0xff0000)
                    .setTimestamp();
            }

            // --- TEXTO DE APRESENTAÇÃO: REVOGAÇÃO ---
            if (customId === 'btn_revogacao') {
                nomeCanal = `📝-revogacao-${user.username}`;
                cargoAcessoId = config.idCargoStaff;
                mencaoCargo = `<@&${config.idCargoStaff}>`;

                embedTicket
                    .setTitle("📝 DEPARTAMENTO DE REVISÃO E REVOGAÇÃO")
                    .setDescription(
                        `Olá ${user},\n\n` +
                        `Este canal foi aberto para que você possa apresentar sua contestação formal em relação a punições, advertências administrativas (*warns*) ou banimentos aplicados dentro do servidor.\n\n` +
                        `A mesa administrativa analisará o seu caso com base nas regras gerais da cidade e nas provas apresentadas por ambas as partes. Por favor, **preencha a sua ficha de defesa abaixo**: Bureaucracy`
                    )
                    .addFields(
                        { name: '📋 Ficha de Contestação', value: 
                            `• **Seu Passaporte (ID):**\n` +
                            `• **Qual punição deseja revogar?:** (Ex: Advertência na PM, Ban da Cidade, Warn de Facção)\n` +
                            `• **Quem aplicou a punição?:** (ID ou nome do Staff/Oficial)\n` +
                            `• **Sua Justificativa/Defesa:** (Explique por que a punição deve ser anulada ou revista)\n` +
                            `• **Provas de Inocência (Se houver):** (Links de contra-provas em vídeo)`
                        },
                        { name: '⏳ Próximos Passos', value: `Aguarde pacientemente. A Staff irá analisar os logs da sua ação. Não marque os administradores no chat.` }
                    )
                    .setColor(0x0000ff)
                    .setTimestamp();
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
