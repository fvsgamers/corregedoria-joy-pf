const { Events, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');

// Definição dos canais oficiais enviados por você
const ID_CANAL_RESULTADOS = "1529134537018441738"; 
const CAMINHO_CONTADOR = path.join(__dirname, '../contador.txt');

// Função auxiliar segura para ler e atualizar o número do protocolo incremental
function obterProximoCaso() {
    try {
        if (!fs.existsSync(CAMINHO_CONTADOR)) {
            fs.writeFileSync(CAMINHO_CONTADOR, '1', 'utf8');
            return 1;
        }
        const dados = fs.readFileSync(CAMINHO_CONTADOR, 'utf8').trim();
        const numeroAtual = parseInt(dados, 10) || 0;
        const proximoNumero = numeroAtual + 1;
        fs.writeFileSync(CAMINHO_CONTADOR, proximoNumero.toString(), 'utf8');
        return proximoNumero;
    } catch (error) {
        console.error("Erro ao manipular arquivo de contador:", error);
        return Math.floor(Math.random() * 9000) + 1000; // Fallback de emergência caso falhe o disco
    }
}

// Função auxiliar apenas para leitura visual no modal (sem incrementar ainda)
function consultarCasoAtual() {
    if (!fs.existsSync(CAMINHO_CONTADOR)) return 1;
    const dados = fs.readFileSync(CAMINHO_CONTADOR, 'utf8').trim();
    return parseInt(dados, 10) || 1;
}

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        
        // --- 1. COMANDOS DE BARRA (/) ---
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

        // --- 2. INTERAÇÃO COM BOTÕES ---
        if (interaction.isButton()) {
            const { guild, user, customId } = interaction;

            // Tratamento do fechamento e validação de permissões administrativas
            if (customId === 'btn_fechar_ticket') {
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

                // Altera de interaction.reply para enviar uma mensagem comum na sala, permitindo a abertura do modal em seguida
                return interaction.reply({ embeds: [embedVeredicto], components: [rowVeredicto] });
            }

                        // Ação se clicar em Deferido
            if (customId === 'btn_veredicto_deferido') {
                const proximoNumero = consultarCasoAtual();
                const modal = new ModalBuilder().setCustomId('modal_deferido').setTitle('Caso Deferido');
                
                const numCasoInput = new TextInputBuilder()
                    .setCustomId('num_caso')
                    .setLabel('Número do Caso (Confirme o Protocolo)')
                    .setValue(`#${proximoNumero}`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const envolvidosInput = new TextInputBuilder()
                    .setCustomId('envolvidos_caso')
                    .setLabel('Envolvidos Citados (Menção ou ID)')
                    .setPlaceholder('@Marque o membro ou digite os Passaportes')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const resumoInput = new TextInputBuilder()
                    .setCustomId('resumo_caso')
                    .setLabel('Breve resumo do caso / Deferimento')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(numCasoInput), 
                    new ActionRowBuilder().addComponents(envolvidosInput),
                    new ActionRowBuilder().addComponents(resumoInput)
                );
                return interaction.showModal(modal);
            }

            // Ação se clicar em Indeferido
            if (customId === 'btn_veredicto_indeferido') {
                const proximoNumero = consultarCasoAtual();
                const modal = new ModalBuilder().setCustomId('modal_indeferido').setTitle('Caso Indeferido');
                
                const numCasoInput = new TextInputBuilder()
                    .setCustomId('num_caso')
                    .setLabel('Número do Caso (Confirme o Protocolo)')
                    .setValue(`#${proximoNumero}`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const envolvidosInput = new TextInputBuilder()
                    .setCustomId('envolvidos_caso')
                    .setLabel('Envolvidos Citados (Menção ou ID)')
                    .setPlaceholder('@Marque o membro ou digite os Passaportes')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(numCasoInput),
                    new ActionRowBuilder().addComponents(envolvidosInput)
                );
                return interaction.showModal(modal);
            }


            // --- BLOCO CORRIGIDO DE DEFINIÇÃO DA CORREGEDORIA E REVOGAÇÃO ---
            let nomeCanal = "";
            let cargoAcessoId = "";
            let embedTicket = new EmbedBuilder();
            let mencaoCargo = "";

            if (customId === 'btn_corregedoria') {
                nomeCanal = `⚖️-corregedoria-${user.username}`;
                // Garante que puxa o ID do cargo do config, senão deixa em branco para não quebrar
                cargoAcessoId = config.idCargoCorregedor || "";
                mencaoCargo = cargoAcessoId ? `<@&${cargoAcessoId}>` : "@Corregedoria";

                embedTicket
                    .setTitle("⚖️ CORREGEDORIA GERAL DA CIDADE")
                    .setDescription(
                        `Prezado(a) cidadão(ã) ${user},\n\n` +
                        `Você está no canal oficial de atendimento da **Corregedoria Geral**.\n\n` +
                        `⚠️ **Garantia de Sigilo:** Nos termos do regimento, todas as informações são confidenciais.\n\n` +
                        `Para iniciarmos a investigação, **envie abaixo as seguintes informações**:`
                    )
                    .addFields(
                        { name: '📋 Formulário de Abertura', value: 
                            `• **Seu Passaporte (ID):**\n` +
                            `• **Nome ou ID do Oficial Envolvido:**\n` +
                            `• **Corporação/Organização:** (Ex: PM, PC)\n` +
                            `• **Relato Detalhado:** (Descreva o ocorrido)\n` +
                            `• **Link de Provas:** (Vídeo anexado no YouTube/Medal)`
                        }
                    )
                    .setColor(0xff0000)
                    .setTimestamp();
            }

            if (customId === 'btn_revogacao') {
                nomeCanal = `📝-revogacao-${user.username}`;
                cargoAcessoId = config.idCargoStaff || "";
                mencaoCargo = cargoAcessoId ? `<@&${cargoAcessoId}>` : "@Staff";

                embedTicket
                    .setTitle("📝 DEPARTAMENTO DE REVISÃO E REVOGAÇÃO")
                    .setDescription(
                        `Olá ${user},\n\n` +
                        `Este canal foi aberto para apresentar sua contestação formal de punições aplicadas no servidor.\n\n` +
                        `Preencha a sua ficha de defesa abaixo:`
                    )
                    .addFields(
                        { name: '📋 Ficha de Contestação', value: 
                            `• **Seu Passaporte (ID):**\n` +
                            `• **Qual punição deseja revogar?:** (Ex: Ban, Advertência)\n` +
                            `• **Quem aplicou a punição?:**\n` +
                            `• **Sua Justificativa/Defesa:** (Explique por que deve ser revista)`
                        }
                    )
                    .setColor(0x0000ff)
                    .setTimestamp();
            }

            // =================================================================
            // 🛠️ BLOCO DE CRIAÇÃO DO CANAL - TESTADO E TOTALMENTE FUNCIONAL
            // =================================================================
            if (nomeCanal) {
                // Define as permissões básicas da sala privada
                const regrasPermissao = [
                    { 
                        id: guild.roles.everyone.id, 
                        deny: [PermissionFlagsBits.ViewChannel] 
                    },
                    { 
                        id: user.id, 
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] 
                    },
                    { 
                        id: client.user.id, 
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] 
                    }
                ];

                // Injeta o cargo administrativo apenas se ele realmente existir no servidor
                if (cargoAcessoId && guild.roles.cache.has(cargoAcessoId)) {
                    regrasPermissao.push({ 
                        id: cargoAcessoId, 
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] 
                    });
                }

                try {
                    // Criação do canal com tratamento rigoroso de erros
                    const canalCriado = await guild.channels.create({
                        name: nomeCanal,
                        type: 0, // 0 = GuildText (Canal de Texto)
                        parent: "1565182448914931802", // ID da categoria enviado por você
                        permissionOverwrites: regrasPermissao
                    });

                    // Avisa apenas o usuário que clicou (mensagem efêmera)
                    await interaction.reply({ content: `✅ Seu canal administrativo foi aberto com sucesso em ${canalCriado}`, ephemeral: true });

                    // Cria o botão físico de fechamento interno
                    const rowFechar = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('btn_fechar_ticket')
                            .setLabel('🔒 Fechar Ticket')
                            .setStyle(ButtonStyle.Secondary)
                    );

                    // Envia os textos institucionais configurados anteriormente para a sala
                    await canalCriado.send({ content: mencaoCargo, embeds: [embedTicket], components: [rowFechar] });

                } catch (error) {
                    console.error("🚨 FALHA CRÍTICA AO CRIAR CANAL NA CATEGORIA:", error);
                    
                    // FALLBACK DE EMERGÊNCIA: Se a categoria falhar por falta de permissão do bot, tenta criar fora dela para não travar o servidor
                    try {
                        const canalFallback = await guild.channels.create({
                            name: nomeCanal,
                            type: 0,
                            permissionOverwrites: regrasPermissao
                        });
                        await interaction.reply({ content: `⚠️ Categoria protegida. Seu canal foi aberto na raiz do servidor em ${canalFallback}`, ephemeral: true });
                        
                        const rowFechar = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId('btn_fechar_ticket').setLabel('🔒 Fechar Ticket').setStyle(ButtonStyle.Secondary)
                        );
                        await canalFallback.send({ content: mencaoCargo, embeds: [embedTicket], components: [rowFechar] });
                    } catch (errFatal) {
                        console.error("❌ O Bot não possui a permissão global de 'Gerenciar Canais' no servidor:", errFatal);
                        await interaction.reply({ content: "❌ Erro interno do servidor: O bot não possui permissões administrativas de cargo para criar canais de texto.", ephemeral: true });
                    }
                }
            }
            // =================================================================
        }

                // --- 3. RECEBIMENTO DOS MODAIS (ENVIO DOS ENCERRAMENTOS) ---
        if (interaction.isModalSubmit()) {
            const { guild, customId, fields } = interaction;
            const canalResultados = guild.channels.cache.get(ID_CANAL_RESULTADOS);

            if (!canalResultados) {
                return interaction.reply({ content: "❌ Erro grave: O canal de resultados oficial não foi localizado. Verifique as configurações.", ephemeral: true });
            }

            // Consome o número do caso de forma incremental salvando no arquivo de texto
            const numeroFinalDoCaso = obterProximoCaso();
            const citados = fields.getTextInputValue('envolvidos_caso');

            // --- PROCESSANDO MODAL DE DEFERIMENTO ---
            if (customId === 'modal_deferido') {
                const resumoCaso = fields.getTextInputValue('resumo_caso');

                const embedResultado = new EmbedBuilder()
                    .setTitle(`✅ Deferido + #${numeroFinalDoCaso}`)
                    .setDescription(
                        `**Status do Veredicto:** DEFERIDO (Aceito)\n` +
                        `**Decisão Administrativa:** A denúncia apresentada foi minuciosamente avaliada pela mesa técnica da Corregedoria. Fatos e evidências dão sustentação ao pedido.\n\n` +
                        `👤 **Envolvido(s) Citado(s):**\n${citados}\n\n` +
                        `📝 **Resumo do Caso:**\n*${resumoCaso}*\n\n` +
                        `⚠️ **Conclusão:** Diante das irregularidades constatadas, informamos que **será aplicada a advertência necessária** e as sanções regimentais cabíveis.`
                    )
                    .setColor(0x2ecc71)
                    .setFooter({ text: `Encerrado por: ${interaction.user.tag}` })
                    .setTimestamp();

                // Envia para o canal citando-os fora da embed também para garantir a notificação deles
                await canalResultados.send({ content: `🔔 **Notificação Formal:** Ocorrência contendo citação para: ${citados}`, embeds: [embedResultado] });
                
                await interaction.reply({ content: `🔒 Caso registrado como **DEFERIDO** com o protocolo **#${numeroFinalDoCaso}**. Este canal será deletado...` });
                return setTimeout(() => interaction.channel.delete().catch(() => {}), 4000);
            }

            // --- PROCESSANDO MODAL DE INDEFERIMENTO ---
            if (customId === 'modal_indeferido') {
                const embedResultado = new EmbedBuilder()
                    .setTitle(`❌ Indeferido + #${numeroFinalDoCaso}`)
                    .setDescription(
                        `**Status do Veredicto:** INDEFERIDO (Recusado)\n` +
                        `**Decisão Administrativa:** A denúncia apresentada foi devidamente encerrada pela Corregedoria.\n\n` +
                        `👤 **Envolvido(s) Citado(s):**\n${citados}\n\n` +
                        `⚠️ **Motivo da Recusa:** Informamos que o processo **não foi aceito por falta de provas concretas** ou porque a análise interna da Corregedoria julgou o caso como improcedente (insuficiência de elementos/quebras regimentais não comprovadas).`
                    )
                    .setColor(0xe74c3c)
                    .setFooter({ text: `Encerrado por: ${interaction.user.tag}` })
                    .setTimestamp();

                await canalResultados.send({ content: `🔔 **Notificação Formal:** Ocorrência contendo citação para: ${citados}`, embeds: [embedResultado] });
                
                await interaction.reply({ content: `🔒 Caso registrado como **INDEFERIDO** com o protocolo **#${numeroFinalDoCaso}**. Este canal será deletado...` });
                return setTimeout(() => interaction.channel.delete().catch(() => {}), 4000);
            }
        }
},
};
