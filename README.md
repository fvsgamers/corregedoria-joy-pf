# 🏛️ Bot de Corregedoria e Revogação - GTA RP

[![Discord.js](https://shields.io)](https://js.org)
[![Node.js](https://shields.io)](https://nodejs.org)
[![Discloud](https://shields.io)](https://discloud.com)

Um bot profissional de gerenciamento de **Tickets Privados** para servidores de GTA RP (Roleplay), desenvolvido em JavaScript utilizando a biblioteca `discord.js` (v14). O foco principal deste sistema é automatizar, organizar e manter o sigilo absoluto de processos de **Corregedoria** (denúncias contra corporações) e pedidos de **Revogação** (revisão de punições/bans).

---

## 🚀 Funcionalidades Principais

*   **Painel Centralizado interativo (`/setup`):** Um comando slash moderno que gera um painel com botões limpos e intuitivos no canal escolhido.
*   **Sistema de Tickets Privados:** Ao clicar em um botão, o bot gera dinamicamente um canal de texto oculto para o restante do servidor.
*   **Permissões Automatizadas por Cargo:** 
    *   **⚖️ Corregedoria:** Libera acesso à sala apenas para o jogador e para o cargo configurado de **Corregedor** (ex: Comandantes/Corregedores da PM).
    *   **📝 Revogação:** Libera acesso à sala para o jogador e para o cargo configurado de **Staff/Administração**.
*   **Formulários de RP Integrados:** Envia uma mensagem personalizada dentro do ticket cobrando as informações necessárias (Passaporte, ID do envolvido, motivos e link de vídeo com as provas).
*   **Botão Avançado de Fechamento (`🔒 Fechar Ticket`):** Permite que a equipe encerre o atendimento diretamente pelo canal, deletando a sala após um aviso de 5 segundos.

---

## 📂 Estrutura do Projeto

O código foi arquitetado utilizando uma estrutura escalável de **Handlers** (divisão de comandos e eventos em arquivos separados), garantindo fácil manutenção:

```text
├── commands/
│   └── setup.js                # Comando de barra (Slash) para criar o painel
├── events/
│   ├── ready.js                # Disparado ao iniciar o bot com sucesso
│   └── interactionCreate.js    # Gerencia cliques em botões e comandos (/)
├── config.json                 # Armazenamento seguro de IDs e Tokens
├── deploy-commands.js          # Script para registrar os comandos na API do Discord
├── discloud.config             # Configuração pronta para hospedagem 24/7
├── index.js                    # Inicializador global do Bot e carregador de módulos
└── package.json                # Dependências e scripts do Node.js
```

---

## 🛠️ Pré-requisitos e Instalação

### 1. Clonar e Instalar Dependências
Abra o terminal na pasta do projeto e execute:
```bash
npm install
```

### 2. Configurar o Ambiente (`config.json`)
Abra o arquivo `config.json` e substitua as informações pelos dados obtidos no [Discord Developer Portal](https://discord.com):

```json
{
  "token": "SEU_TOKEN_AQUI",
  "clientId": "ID_DO_SEU_BOT_AQUI",
  "guildId": "ID_DO_SEU_SERVIDOR_AQUI",
  "idCargoCorregedor": "ID_DO_CARGO_DE_CORREGEDOR_AQUI",
  "idCargoStaff": "ID_DO_CARGO_DE_STAFF_AQUI"
}
```
> 💡 *Nota: Certifique-se de ativar o **Modo Desenvolvedor** no seu Discord para conseguir copiar os IDs dos cargos com o botão direito.*

### 3. Registrar os Comandos de Barra
Antes de ligar o bot pela primeira vez, sincronize o comando `/setup` com o Discord executando:
```bash
npm run deploy
```

---

## 🚦 Como Iniciar o Bot

Para iniciar o bot em ambiente local, utilize o comando:
```bash
npm start
```

### ☁️ Hospedagem (Discloud)
Este repositório já inclui o arquivo `discloud.config` configurado com **100MB de RAM**. Para mantê-lo ligado 24/7, basta zipar os arquivos do projeto (excluindo a pasta `node_modules`) e realizar o upload no painel da Discloud.

---

## 📜 Licença

Este projeto é de código aberto e está disponível sob a licença MIT. Sinta-se livre para clonar, modificar e adaptar para as regras da sua cidade de RP!
