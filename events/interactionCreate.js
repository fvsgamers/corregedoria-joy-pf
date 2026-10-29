const { Events, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const config = require('../config.json');

// ID do canal de resultados enviado por você
const ID_CANAL_RESULTADOS = "1529134537018441738"; 

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        
        // --- 1. GERENCIAMENTO DE COMANDOS DE BARRA (/) ---
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

        // --- 2. GERENCIAMENTO DE CLIQUES NOS BOTÕES ---
        if (interaction.isButton()) {
            const { guild, user, customId } = interaction;

            // Botão inicial de fechar: Pergunta o veredicto com novos botões
            if (customId === 'btn_fechar_ticket') {
                // Verifica se quem está fechando tem o cargo administrativo correto
                const temAcesso = interaction.member.roles.cache.has(config.idCargoCorregedor) || 
                                  interaction.member.roles.cache.has(config.idCargoStaff) || 
                                  interaction.member.permissions.has(PermissionFlagsBits.Administrator);

                if (!temAcesso) {
                    return interaction.reply({ content: "❌ Apenas membros da Corregedoria ou Staff podem definir o veredicto deste caso.", ephemeral: true });
                }

                const embedVeredicto = new EmbedBuilder()
                    .setTitle("🔒 ENCERRAMENTO DE OCORRÊNCIA")
                    .setDescription("Por favor, selecione abaixo o veredicto final desta manifestação antes do arquivamento:")
                    .setColor(0x2f3136);

                const rowVeredicto = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('btn_veredicto_deferido').setLabel('✅ Deferido').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('btn_veredicto_indeferido').setLabel('❌ Indeferido').setStyle(ButtonStyle.Danger)
                );

                return interaction.reply({ embeds: [embedVeredicto], components: [rowVeredicto] });
            }

            // Se clicou em Deferido: Abre a caixinha flutuante para digitar o Número e o Resumo do Caso
            if (customId === 'btn_veredicto_deferido') {
                const modal = new ModalBuilder().setCustomId('modal_deferido').setTitle('Definir Caso como Deferido');
                
                const numCasoInput = new TextInputBuilder().setCustomId('num_caso').setLabel('Número do Caso (Ex: 001/2026)').setStyle(TextInputStyle.Short).setRequired(true);
                const resumoInput = new TextInputBuilder().setCustomId('resumo_caso').setLabel('Breve resumo do caso / Deferimento').setStyle(TextInputStyle.Paragraph).setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(numCasoInput), new ActionRowBuilder().addComponents(resumoInput));
                return interaction.showModal(modal);
            }

            // Se clicou em Indeferido: Abre a caixinha flutuante apenas para o Número do Caso
            if (customId === 'btn_veredicto_indeferido') {
                const modal = new ModalBuilder().setCustomId('modal_indeferido').setTitle('Definir Caso como Indeferido');
                
                const numCasoInput = new TextInputBuilder().setCustomId('num_caso').setLabel('Número do Caso (Ex: 002/2026)').setStyle(TextInputStyle.Short).setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(numCasoInput));
                return interaction.showModal(modal);
            }

            // --- CRIAÇÃO DOS TICKETS INICIAIS ---
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
                    .setDescription(
                        `Prezado(a) cidadão(ã) ${user},\n\n` +
                        `Você está no canal oficial de atendimento da **Corregedoria Geral**. Este espaço é destinado exclusivamente para a apuração de desvios de conduta, abusos de autoridade ou descumprimento de procedimentos institucionais por parte de funcionários públicos e forças policiais.\n\n` +
                        `⚠️ **Garantia de Sigilo:** Nos termos do regimento da cidade, todas as informações aqui registradas são estritamente confidenciais.\n\n` +
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

            if (customId === 'btn_revogacao') {
                nomeCanal = `📝-revogacao-${user.username}`;
                cargoAcessoId = config.idCargoStaff;
                mencaoCargo = `<@&${config.idCargoStaff}>`;

                embedTicket
                    .setTitle("📝 DEPARTAMENTO DE REVISÃO E REVOGAÇÃO")
                    .setDescription(
                        `Olá ${user},\n\n` +
                        `Este canal foi aberto para que você possa apresentar sua contestação formal em relação a punições, advertências administrativas (*warns*) ou banimentos aplicados dentro do servidor.\n\n` +
                        `A mesa administrativa analisará o seu caso com base nas regras gerais da cidade. Por favor, **preencha a sua ficha de defesa abaixo**:`
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

        // --- 3. GERENCIAMENTO DE ENVIO DOS MODAIS (RESPOSTAS DOS FORMULÁRIOS FLUTUANTES) ---
        if (interaction.isModalSubmit()) {
            const { guild, customId, fields } = interaction;
            const canalResultados = guild.channels.cache.get(ID_CANAL_RESULTADOS);

            if (!canalResultados) {
                return interaction.reply({ content: "❌ Erro grave: O canal de resultados oficial não foi encontrado no servidor. Verifique o ID do canal.", ephemeral: true });
            }

            const numCaso = fields.getTextInputValue('num_caso');

            // --- PROCESSANDO MODAL DE DEFERIMENTO ---
            if (customId === 'modal_deferido') {
                const resumoCaso = fields.getTextInputValue('resumo_caso');

                const embedResultado = new EmbedBuilder()
                    .setTitle(`✅ Deferido + ${numCaso}`)
                    .setDescription(
                        `**Status do Veredicto:** DEFERIDO (Aceito)\n` +
                        `**Decisão Administrativa:** A denúncia apresentada foi minuciosamente avaliada pela mesa técnica da Corregedoria. Fatos e evidências dão sustentação ao pedido.\n\n` +
                        `📝 **Resumo do Caso:**\n*${resumoCaso}*\n\n` +
                        `⚠️ **Conclusão:** Diante das irregularidades constatadas, informamos que **será aplicada a advertência necessária** e as sanções regimentais cabíveis ao oficial/membro envolvido.`
                    )
                    .setColor(0x2ecc71) // Verde escuro institucional
                    .setFooter({ text: `Encerrado por: ${interaction.user.tag}` })
                    .setTimestamp();

                // Envia o veredicto no canal específico
                await canalResultados.send({ embeds: [embedResultado] });
                
                await interaction.reply("🔒 Caso registrado como **DEFERIDO** com sucesso. Este canal será deletado em breve...");
                return setTimeout(() => interaction.channel.delete().catch(() => {}), 4000);
            }

            // --- PROCESSANDO MODAL DE INDEFERIMENTO ---
            if (customId === 'modal_indeferido') {
                const embedResultado = new EmbedBuilder()
                    .setTitle(`❌ Indeferido + ${numCaso}`)
                    .setDescription(
                        `**Status do Veredicto:** INDEFERIDO (Recusado)\n` +
                        `**Decisão Administrativa:** A denúncia apresentada foi devidamente encerrada pela Corregedoria.\n\n` +
                        `⚠️ **Motivo da Recusa:** Informamos que o processo **não foi aceito por falta de provas concretas** ou porque a análise interna da Corregedoria julgou o caso como improcedente (insuficiência de elementos/quebras regimentais não comprovadas).`
                    )
                    .setColor(0xe74c3c) // Vermelho escuro
                    .setFooter({ text: `Encerrado por: ${interaction.user.tag}` })
                    .setTimestamp();

                await canalResultados.send({ embeds: [embedResultado] });
                
                await interaction.reply("🔒 Caso registrado como **INDEFERIDO** com sucesso. Este canal será deletado em breve...");
                return setTimeout(() => interaction.channel.delete().catch(() => {}), 4000);
            }
        }
    },
};
