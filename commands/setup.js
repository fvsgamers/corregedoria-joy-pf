const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Envia o painel de atendimento da Corregedoria')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle("🏛️ DEPARTAMENTO ADMINISTRATIVO DA CIDADE")
            .setDescription(
                "Selecione abaixo o serviço que deseja abrir o atendimento privado.\n\n" +
                "⚠️ **Avisos Importantes:**\n" +
                "• Denúncias falsas ou abusos no sistema de tickets gerarão punições na cidade.\n" +
                "• Tenha as provas em mãos antes de abrir o chamado."
            )
            .setColor(0x2f3136);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_corregedoria')
                .setLabel('⚖️ Corregedoria')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('btn_revogacao')
                .setLabel('📝 Revogação')
                .setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({ content: 'Painel enviado!', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [row] });
    },
};
