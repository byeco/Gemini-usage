const { GoogleGenerativeAI, GoogleGenerativeAIResponseError } = require("@google/generative-ai");
const { Client, Intents } = require("discord.js");
const axios = require('axios');
const fs = require("fs");

const API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyDMzVF2QEE_P-gQYtVSFy7fEit42OA0y-4";


const genAI = new GoogleGenerativeAI("AIzaSyDMzVF2QEE_P-gQYtVSFy7fEit42OA0y-4");
const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MEMBERS
    ],
});



const databaseFile = "veri.json";

if (!fs.existsSync(databaseFile)) {
    fs.writeFileSync(databaseFile, JSON.stringify({}));
}

function getDatabase() {
    const data = fs.readFileSync(databaseFile);
    return JSON.parse(data);
}

function updateDatabase(data) {
    fs.writeFileSync(databaseFile, JSON.stringify(data));
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

    // Botun durumunu ayarla
    client.user.setActivity("Bu Dünya gerçek mi ?", { type: "WATCHING" });
});

client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.mentions.has(client.user)) return;

    const userNickname = message.member?.displayName || message.author.username;

    if (message.content.includes("hak-kontrol-et")) {
        const userId = message.author.id;
        const database = getDatabase();
        const userData = database[userId] || { hak: 0, pre: 0 };
        message.reply(`Hak sayınız: ${userData.hak}`);
        return;
    }

    const userId = message.author.id;
    const database = getDatabase();
    const userData = database[userId] || { hak: 0, pre: 0 };
    userData.hak++;
    database[userId] = userData;
    updateDatabase(database);

    if (userData.hak === 200 && userData.pre !== 1) {
        const userDataFromDatabase = getDatabase()[userId] || { hak: 0, pre: 0 };
        if (userDataFromDatabase.pre === 1) {
            // Kullanıcı premium ise devam et
            console.log("Kullanıcı premium, devam ediliyor...");
        } else {
            message.reply("Uyarı! 200 defa kullanıldı. Premium alarak sınırsız kullanım hakkı elde edebilirsiniz.");
            return;
        }
    }

    const isPremium = userData.pre === 1;
    const maxAttempts = isPremium ? 200 : 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const chat = model.startChat({
                history: [
                    {
                        role: "user",
                        parts: `${message.content}`,
                    },
                    {
                        role: "model",
                        parts: "",
                    },
                ],
                generationConfig: {
                    maxOutputTokens: 1000000,
                },
            });

            const result = await chat.sendMessage(message.content);
            const response = await result.response;
            const generatedText = response.text();

            if (generatedText.trim() !== "") {
                let replyText = "";
            
                // Kullanıcı premium ise ve hakları dolmamışsa
                if (userData.pre === 1) {
                    if (userData.hak < 200) {
                        replyText = generatedText.length > 2000 ? generatedText.substring(0, 2000) : generatedText;
                    } else {
                        replyText = generatedText.length > 2000 ? generatedText.substring(0, 2000) : generatedText;
                    }
                } else { // Kullanıcı premium değilse ve hakları dolmamışsa
                    if (userData.hak < 200) {
                        replyText = generatedText.length > 2000 ? generatedText.substring(0, 2000) : generatedText;
                    } else {
                        replyText = "Uyarı! 200 defa kullanıldı. Premium alarak sınırsız kullanım hakkı elde edebilirsiniz.";
                    }
                }
            
                if (replyText.trim() !== "") {
                    message.reply(replyText);
                } else {
                    console.warn("Generated text is empty. Not sending the reply.");
                }
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
client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.mentions.has(client.user)) return;

    const channel = message.channel;

    try {
        const messages = await channel.messages.fetch({ limit: 10 }); // Son 10 mesajı al

        // Sadece kendi mesajlarınızı filtreleyin
        const myMessages = messages.filter(msg => msg.author.id === message.author.id);

        // Mesajları bir diziye aktar
        const messageArray = myMessages.map(msg => {
            return {
                author: msg.author.username,
                content: msg.content,
                timestamp: msg.createdTimestamp
            };
        });

        // Mesajları API'ye gönder
        const response = await axios.post(API_ENDPOINT, { messages: messageArray });

        console.log("Mesaj geçmişi API'ye gönderildi:", response.data);
    } catch (error) {
        console.error("Mesaj geçmişi alınırken bir hata oluştu:", error);
    }
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

client.login('MTIwOTE3NDE4NTk1NjYxNDE5NA.GZk4r-.SfdcEb3fGWIpy56PblSRu_u5MDwHoGMgr427BY');
