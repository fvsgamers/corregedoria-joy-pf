const { Events, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, UserSelectMenuBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');

// Definição dos canais e categorias oficiais enviados por você
const ID_CANAL_RESULTADOS = "1529134537018441738"; 
const ID_CATEGORIA_TICKETS = "1565178591820386314";
const CAMINHO_CONTADOR = path.join(__dirname, '../contador.txt');

// Banco temporário em memória para salvar as etapas de fechamento de cada canal
const memoriaFechamento = new Map();

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
        return Math.floor(Math.random() * 9000) + 1000;
    }
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
            const { guild, user, customId, channelId } = interaction;

            // BOTÃO: Iniciar o processo de fechamento do chamado
            if (customId === 'btn_fechar_ticket') {
                const temAcesso = interaction.member.roles.cache.has(config.idCargoCorregedor) || 
                                  interaction.member.roles.cache.has(config.idCargoStaff) || 
                                  interaction.member.permissions.has(PermissionFlagsBits.Administrator);

                if (!temAcesso) {
                    return interaction.reply({ content: "❌ Apenas membros da Corregedoria ou Staff podem definir o veredicto deste caso.", ephemeral: true });
                }

                const embedFiltro = new EmbedBuilder()
                    .setTitle("👤 SELEÇÃO DE ENVOLVIDOS")
                    .setDescription("Selecione abaixo o(s) usuário(s) que receberá(ão) o veredicto deste caso. Você pode marcar mais de um se necessário:")
                    .setColor(0x2f3136);

                const menuUsuarios = new UserSelectMenuBuilder()
                    .setCustomId('selecao_membros_caso')
                    .setPlaceholder('Clique aqui para selecionar os envolvidos...')
                    .setMinValues(1)
                    .setMaxValues(10);

                const rowUsuarios = new ActionRowBuilder().addComponents(menuUsuarios);

                return interaction.reply({ embeds: [embedFiltro], components: [rowUsuarios] });
            }

            // BOTÃO: Veredicto Deferido (Abre seleção de advertências)
            if (customId === 'btn_final_deferido') {
                const menuAdvs = new StringSelectMenuBuilder()
                    .setCustomId('menu_advertencias_multiplas')
                    .setPlaceholder('Selecione uma ou mais advertências...')
                    .setMinValues(1)
                    .setMaxValues(4)
                    .addOptions([
                        { label: 'Advertência Verbal', description: 'ID: 1511367174307188866', value: '1511367174307188866' },
                        { label: 'Advertência Escrita Nível 1', description: 'ID: 1394767944176631969', value: '1394767944176631969' },
                        { label: 'Advertência Geral Nível 2', description: 'ID: 1394767901218836521', value: '1394767901218836521' },
                        { label: 'Suspensão Administrativa', description: 'ID: 1394767862174060705', value: '1394767862174060705' }
                    ]);

                const rowAdvs = new ActionRowBuilder().addComponents(menuAdvs);
                return interaction.update({ content: '🚨 **Selecione as punições aplicáveis abaixo:**', embeds: [], components: [rowAdvs] });
            }

                        // BOTÃO: Veredicto Indeferido (Texto Elaborado + Transcript + Delete em 10s)
            if (customId === 'btn_final_indeferido') {
                const dadosCaso = memoriaFechamento.get(channelId);
                const canalResultados = guild.channels.cache.get(ID_CANAL_RESULTADOS);
                const numeroFinalDoCaso = obterProximoCaso();
                const ID_CANAL_TRANSCRIPTS = "1565194110199930971";

                if (dadosCaso && canalResultados) {
                    const listaMencionados = dadosCaso.envolvidos.map(id => `<@${id}>`).join(', ');

                    // TEXTO ELABORADO DE INDEFERIMENTO
                    const embedResultado = new EmbedBuilder()
                        .setTitle(`🏛️ INDEFERIDO + #${numeroFinalDoCaso}`)
                        .setDescription(
                            `**STATUS JURÍDICO:** SENTENÇA INDEFERIDA (IMPROCEDENTE)\n\n` +
                            `A Corregedoria Geral da Cidade, após análise detida dos fatos narrados e verificação da idoneidade material trazida aos autos do chamado, declara o processo **ARQUIVADO**.\n\n` +
                            `👤 **Membros Citados:** ${listaMencionados}\n\n` +
                            `⚠️ **Fundamentação da Recusa:** A postulação não reuniu condições mínimas de admissibilidade, sendo rejeitada por **total ausência de elementos probatórios concretos** (falta de filmagens claras ou evidências inequívocas) ou por incompatibilidade técnica com o regimento disciplinar de condutas vigentes na cidade.`
                        )
                        .setColor(0xe74c3c)
                        .setFooter({ text: `Relator Responsável: ${interaction.user.tag}` })
                        .setTimestamp();

                    await canalResultados.send({ content: `🔔 **Notificação de Arquivamento:** ${listaMencionados}`, embeds: [embedResultado] });
                }

                // GERADOR DE TRANSCRIPT PARA CASO INDEFERIDO
                try {
                    const mensagens = await interaction.channel.messages.fetch({ limit: 100 });
                    let conteudoTexto = `=== TRANSCRIPT OFICIAL DE ATENDIMENTO - CASO INDEFERIDO #${numeroFinalDoCaso} ===\n`;
                    conteudoTexto += `Canal: ${interaction.channel.name} | Exportado em: ${new Date().toLocaleString('pt-BR')}\n\n`;

                    const msgOrdenadas = mensagens.reverse();
                    msgOrdenadas.forEach(m => {
                        conteudoTexto += `[${m.createdAt.toLocaleTimeString('pt-BR')}] ${m.author.tag}: ${m.content}\n`;
                    });

                    const nomeArquivo = `transcript-indeferido-${numeroFinalDoCaso}.txt`;
                    const bufferTexto = Buffer.from(conteudoTexto, 'utf-8');

                    const canalAuditoria = guild.channels.cache.get(ID_CANAL_TRANSCRIPTS) || await guild.channels.fetch(ID_CANAL_TRANSCRIPTS).catch(() => null);
                    if (canalAuditoria) {
                        await canalAuditoria.send({ 
                            content: `📁 **Histórico de Arquivamento:** Caso \`#${numeroFinalDoCaso}\` arquivado/indeferido por ${interaction.user}.`,
                            files: [{ attachment: bufferTexto, name: nomeArquivo }]
                        });
                    }
                } catch (e) { console.error(e); }

                await interaction.update({ content: `🔒 **Caso Indeferido com Sucesso!** Relatório gerado e enviado para a auditoria.\n⚠️ *Este canal será permanentemente deletado em 10 segundos.*`, embeds: [], components: [] });
                memoriaFechamento.delete(channelId);
                return setTimeout(() => interaction.channel.delete().catch(() => {}), 10000);
            }

            // --- LÓGICA DE CRIAÇÃO DE NOVOS TICKETS PRIVADOS ---
            let nomeCanal = "";
            let cargoAcessoId = "";
            let embedTicket = new EmbedBuilder();
            let mencaoCargo = "";

            if (customId === 'btn_corregedoria') {
                nomeCanal = `⚖️-corregedoria-${user.username}`;
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
                    .addFields({ name: '📋 Formulário de Abertura', value: `• **Seu Passaporte (ID):**\n• **Nome ou ID do Oficial Envolvido:**\n• **Corporação/Organização:** (Ex: PM, PC)\n• **Relato Detalhado:**\n• **Link de Provas:** (Vídeo anexado no YouTube/Medal)` })
                    .setColor(0xff0000)
                    .setTimestamp();
            }

            if (customId === 'btn_revogacao') {
                nomeCanal = `📝-revogacao-${user.username}`;
                cargoAcessoId = config.idCargoStaff || "";
                mencaoCargo = cargoAcessoId ? `<@&${cargoAcessoId}>` : "@Staff";

                embedTicket
                    .setTitle("📝 DEPARTAMENTO DE REVISÃO E REVOGAÇÃO")
                    .setDescription(`Olá ${user},\n\nEste canal foi aberto para apresentar sua contestação formal de punições aplicadas no servidor.\n\nPreencha a sua ficha de defesa abaixo:`)
                    .addFields({ name: '📋 Ficha de Contestação', value: `• **Seu Passaporte (ID):**\n• **Qual punição deseja revogar?**\n• **Quem aplicou a punição?**\n• **Sua Justificativa/Defesa:**` })
                    .setColor(0x0000ff)
                    .setTimestamp();
            }

            if (nomeCanal) {
                const regrasPermissao = [
                    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                    { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
                ];

                if (cargoAcessoId && guild.roles.cache.has(cargoAcessoId)) {
                    regrasPermissao.push({ id: cargoAcessoId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
                }

                try {
                    const canalCriado = await guild.channels.create({
                        name: nomeCanal,
                        type: 0,
                        parent: ID_CATEGORIA_TICKETS,
                        permissionOverwrites: regrasPermissao
                    });

                    await interaction.reply({ content: `✅ Seu canal administrativo foi aberto com sucesso em ${canalCriado}`, ephemeral: true });

                                const rowFechar = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('btn_fechar_ticket').setLabel('🔒 Fechar Ticket').setStyle(ButtonStyle.Secondary)
                    );
                    await canalCriado.send({ content: mencaoCargo, embeds: [embedTicket], components: [rowFechar] });
                } catch (error) {
                    console.error("Erro ao criar canal na categoria:", error);
                    await interaction.reply({ content: "❌ Erro: Verifique se o Bot possui a permissão de 'Gerenciar Canais' na categoria alvo.", ephemeral: true });
                }
            }
        }

        // --- 3. GERENCIAMENTO DE SELEÇÃO DE MENUS ---
        if (interaction.isAnySelectMenu()) {
            const { customId, values, channelId, guild } = interaction;

            // Etapa 1: Captura envolvidos marcados
            if (customId === 'selecao_membros_caso') {
                memoriaFechamento.set(channelId, { envolvidos: values });

                const embedEscolha = new EmbedBuilder()
                    .setTitle("⚖️ ESCOLHA O VEREDICTO FINAL")
                    .setDescription(`Membros selecionados:\n${values.map(id => `<@${id}>`).join('\n')}\n\nEscolha o desfecho deste atendimento técnico:`)
                    .setColor(0x2f3136);

                const rowEscolhas = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('btn_final_deferido').setLabel('✅ Deferido (Aplicar Punição)').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('btn_final_indeferido').setLabel('❌ Indeferido (Falta de Provas)').setStyle(ButtonStyle.Danger)
                );

                return interaction.update({ embeds: [embedEscolha], components: [rowEscolhas] });
            }

                        // Etapa 2: Processa a seleção múltipla de advertências, gera Transcript e deleta em 10s
            if (customId === 'menu_advertencias_multiplas') {
                const dadosCaso = memoriaFechamento.get(channelId);
                if (!dadosCaso) return interaction.reply({ content: "❌ Erro nas etapas de fechamento. Reabra o menu.", ephemeral: true });

                let canalResultados = guild.channels.cache.get(ID_CANAL_RESULTADOS);
                if (!canalResultados) {
                    try { canalResultados = await guild.channels.fetch(ID_CANAL_RESULTADOS); } catch (e) {
                        canalResultados = guild.channels.cache.find(c => c.name === "resultados-corregedoria" || c.name === "logs-resultados");
                    }
                }

                if (!canalResultados) return interaction.reply({ content: "❌ Erro: O canal de resultados não pôde ser localizado.", ephemeral: true });

                const numeroFinalDoCaso = obterProximoCaso();
                const ID_CARGO_GERAL_ADV = "13947740627062874"; 
                const ID_CANAL_TRANSCRIPTS = "1565194110199930971";

                const dicionarioAdvs = {
                    "1511367174307188866": "Advertência Verbal (Ficha sob análise técnica, sujeito a desligamento imediato)",
                    "1394767944176631969": "Advertência Escrita Nível 1 (Vigência obrigatória: 15 dias corridos)",
                    "1394767901218836521": "Advertência Geral Nível 2 (Vigência obrigatória: 10 dias corridos)",
                    "1394767862174060705": "Suspensão de Atividades Administrativas (Afastamento compulsório: 7 dias)"
                };

                const textoAdvsMarcadas = values.map(id => `• ${dicionarioAdvs[id] || id}`).join('\n');

                // 1. APLICAÇÃO DOS CARGOS INDIVIDUAIS NO DISCORD
                for (const idMembro of dadosCaso.envolvidos) {
                    try {
                        const membroAlvo = await guild.members.fetch(idMembro).catch(() => null);
                        if (membroAlvo) {
                            // Seta o cargo de advertência geral
                            await membroAlvo.roles.add(ID_CARGO_GERAL_ADV).catch(() => {});
                            
                            // Seta todos os cargos específicos selecionados no menu
                            for (const idCargoPunicao of values) {
                                await membroAlvo.roles.add(idCargoPunicao).catch(() => {});
                            }
                        }
                    } catch (err) {
                        console.error(`Falha ao setar cargos no membro ${idMembro}:`, err);
                    }

                    // 2. TEXTO ELABORADO DE DEFERIMENTO
                    const embedIndividual = new EmbedBuilder()
                        .setTitle(`⚖️ DEFERIDO + #${numeroFinalDoCaso}`)
                        .setDescription(
                            `**STATUS JURÍDICO:** SENTENÇA DEFERIDA (PROCEDENTE)\n\n` +
                            `O Departamento de Controle Interno e Corregedoria Geral concluiu a avaliação regulamentar do presente protocolo de ocorrência. Com base no acervo probatório submetido, foi constatado desvio formal de conduta administrativa.\n\n` +
                            `👤 **Infrator Penalizado:** <@${idMembro}>\n\n` +
                            `⚠️ **Sanções Regimentais Aplicadas:**\n${textoAdvsMarcadas}\n\n` +
                            `*Determina-se a averbação imediata deste veredicto na ficha funcional do servidor. Notificação processual expedida.*`
                        )
                        .setColor(0x2ecc71)
                        .setFooter({ text: `Relator Responsável: ${interaction.user.tag}` })
                        .setTimestamp();

                    await canalResultados.send({ content: `🔔 **Citação Processual:** <@${idMembro}>`, embeds: [embedIndividual] });
                }

                // 3. GERADOR NATIVO DE TRANSCRIPT (EXPORTAÇÃO DE CONVERSA)
                try {
                    const mensagens = await interaction.channel.messages.fetch({ limit: 100 });
                    let conteudoTexto = `=== TRANSCRIPT OFICIAL DE ATENDIMENTO - CASO #${numeroFinalDoCaso} ===\n`;
                    conteudoTexto += `Canal: ${interaction.channel.name} | Exportado em: ${new Date().toLocaleString('pt-BR')}\n\n`;

                    const msgOrdenadas = mensagens.reverse();
                    msgOrdenadas.forEach(m => {
                        conteudoTexto += `[${m.createdAt.toLocaleTimeString('pt-BR')}] ${m.author.tag}: ${m.content}\n`;
                        if (m.embeds.length > 0) conteudoTexto += `↳ [Contém Embed de Sistema]\n`;
                    });

                    const nomeArquivo = `transcript-caso-${numeroFinalDoCaso}.txt`;
                    const bufferTexto = Buffer.from(conteudoTexto, 'utf-8');

                    const canalAuditoria = guild.channels.cache.get(ID_CANAL_TRANSCRIPTS) || await guild.channels.fetch(ID_CANAL_TRANSCRIPTS).catch(() => null);
                    if (canalAuditoria) {
                        await canalAuditoria.send({ 
                            content: `📁 **Histórico de Arquivamento:** Caso \`#${numeroFinalDoCaso}\` finalizado por ${interaction.user}. Segue anexo o log completo das conversas.`,
                            files: [{ attachment: bufferTexto, name: nomeArquivo }]
                        });
                    }
                } catch (errTranscript) {
                    console.error("Erro ao gerar ou enviar o transcript:", errTranscript);
                }

                // 4. DELETAR EM 10 SEGUNDOS CRONOMETRADOS
                await interaction.update({ content: `🔒 **Caso Deferido com Sucesso!** Veredicto publicado, cargos aplicados e histórico salvo.\n⚠️ *Este canal será permanentemente deletado em 10 segundos.*`, embeds: [], components: [] });
                memoriaFechamento.delete(channelId);
                return setTimeout(() => interaction.channel.delete().catch(() => {}), 10000);
            }

        }
    },
};
