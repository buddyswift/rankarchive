require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');

// Load the token from environment variables
const token = process.env.BOT_TOKEN;

// Configuration details directly in the code
const clientId = '1144332486625742848';
const guildId = '399087472291610646';
const sourceChannelId = '1196599858841276466';
const targetThreadId = '1207160904156717107';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'archive') {
        // Check if the command is used in the nominated source channel
        if (interaction.channel.id !== sourceChannelId) {
            await interaction.reply('This command can only be used in the specified channel.');
            return;
        }

        const sourceChannel = interaction.channel;
        const targetThread = client.channels.cache.get(targetThreadId);
        if (!targetThread || !targetThread.isThread()) {
            await interaction.reply('Target thread not found or is not a thread.');
            return;
        }

        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        let messages = await fetchMessages(sourceChannel, twoWeeksAgo);

        let archiveData = messages
            .filter(message => message.reactions.cache.has('✅') || message.reactions.cache.has('❌'))
            .map(message => {
                let thumbsUp = message.reactions.cache.get('👍')?.count || 0;
                let thumbsDown = message.reactions.cache.get('👎')?.count || 0;
                let status = message.reactions.cache.has('✅') ? 'Passed' : 'Failed';

                return `Message: ${message.content}\nStatus: ${status}\nThumbs Up: ${thumbsUp}\nThumbs Down: ${thumbsDown}\n\n`;
            }).join('');

        // Split and send the archive data to the target thread
        const chunks = splitMessage(archiveData, 2000);
        for (const chunk of chunks) {
            await targetThread.send(chunk);
        }

        await interaction.reply('Messages have been archived.');
    }
});

async function fetchMessages(channel, afterDate) {
    let messages = [];
    let lastId;

    while (true) {
        const options = { limit: 100 };
        if (lastId) {
            options.before = lastId;
        }

        const fetchedMessages = await channel.messages.fetch(options);
        const filteredMessages = Array.from(fetchedMessages.filter(msg => msg.createdAt > afterDate).values());

        messages.push(...filteredMessages);

        lastId = fetchedMessages.last()?.id;

        if (fetchedMessages.size < 100 || !lastId) {
            break;
        }
    }

    return messages;
}

function splitMessage(message, maxLength) {
    const parts = [];
    while (message.length > maxLength) {
        let part = message.slice(0, maxLength);
        const lastNewLineIndex = part.lastIndexOf('\n');
        if (lastNewLineIndex !== -1) {
            part = part.slice(0, lastNewLineIndex);
        }
        parts.push(part);
        message = message.slice(part.length);
    }
    parts.push(message);
    return parts;
}

client.login(token);
