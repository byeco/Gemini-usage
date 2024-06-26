﻿const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
const { Client, Intents } = require('discord.js');
const axios = require('axios');
const { GoogleGenerativeAI, GoogleGenerativeAIResponseError } = require('@google/generative-ai');
const config = require('./config.json');

const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${config.googleApiKey}`;
const genAI = new GoogleGenerativeAI(config.googleApiKey);

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MEMBERS
    ],
});

const databaseFile = "veri.json";
const messageHistoryFile = "messageHistory.json";

if (!fs.existsSync(databaseFile)) {
    fs.writeFileSync(databaseFile, JSON.stringify({}));
}

if (!fs.existsSync(messageHistoryFile)) {
    fs.writeFileSync(messageHistoryFile, JSON.stringify({}));
}

function getDatabase() {
    const data = fs.readFileSync(databaseFile);
    return JSON.parse(data);
}

function updateDatabase(data) {
    fs.writeFileSync(databaseFile, JSON.stringify(data));
}

function getMessageHistory() {
    const data = fs.readFileSync(messageHistoryFile);
    return JSON.parse(data);
}

function updateMessageHistory(data) {
    fs.writeFileSync(messageHistoryFile, JSON.stringify(data));
}

function setPremiumStatus(userId, status) {
    const database = getDatabase();
    const userData = database[userId] || { hak: 0, pre: 0 };
    userData.pre = status;
    database[userId] = userData;
    updateDatabase(database);
}

function getPremiumStatus(userId) {
    const database = getDatabase();
    return (database[userId] && database[userId].pre) || 0;
}

client.once("ready", () => {
    console.log("Bot is ready! By Byeco");

    setInterval(() => {
        const database = getDatabase();
        Object.keys(database).forEach((userId) => {
            database[userId].hak = 0;
        });
        updateDatabase(database);
        console.log("Veritabanı sıfırlandı.");
    }, 1000 * 60 * 60 * 24 * 1.5);

    client.user.setActivity("Bu Dünya gerçek mi ?", { type: "WATCHING" });
});

client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.mentions.has(client.user)) return;

    const userId = message.author.id;
    const database = getDatabase();
    const userData = database[userId] || { hak: 0, pre: 0 };
    const isPremium = userData.pre === 1;

    if (message.content.includes("hak-kontrol-et")) {
        message.reply(`Hak sayınız: ${userData.hak}`);
        return;
    }

    userData.hak++;
    database[userId] = userData;
    updateDatabase(database);

    if (userData.hak === 200 && !isPremium) {
        message.reply("Uyarı! 200 defa kullanıldı. Premium alarak sınırsız kullanım hakkı elde edebilirsiniz.");
        return;
    }

    const maxAttempts = isPremium ? 200 : 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const chat = model.startChat({
                history: [
                    { role: "user", parts: message.content },
                    { role: "model", parts: "" },
                ],
                generationConfig: {
                    maxOutputTokens: 1000000,
                },
            });

            const result = await chat.sendMessage(message.content);
            const response = await result.response;
            const generatedText = response.text();

            if (generatedText.trim() !== "") {
                let replyText = generatedText.length > 2000 ? generatedText.substring(0, 2000) : generatedText;
                message.reply(replyText);
            } else {
                console.warn("Generated text is empty. Not sending the reply.");
            }

            return;
        } catch (error) {
            console.error(`Error generating response (Attempt ${attempt}):`, error);

            if (error instanceof GoogleGenerativeAIResponseError && error.response && error.response.promptFeedback && error.response.promptFeedback.safetyRatings) {
                console.warn("Generated content was blocked due to safety concerns.");
                break;
            }
        }
    }
    message.reply("Şu an bir sorun var veya güvenlik nedeniyle engellendi, ama normal kısa konuşma yapabilirsiniz.");
});

const commands = new Map();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.set(command.data.name, command);
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (!commands.has(commandName)) return;

    try {
        await commands.get(commandName).execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'Bir hata oluştu!', ephemeral: true });
    }
});

client.login(config.discordToken);
