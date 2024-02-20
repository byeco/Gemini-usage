const { GoogleGenerativeAI, GoogleGenerativeAIResponseError } = require("@google/generative-ai");
const { Client, Intents } = require("discord.js");
const fs = require("fs");


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

function setPremiumStatus(serverId, status) {
    const database = getDatabase();
    const serverData = database[serverId] || { hak: 0, pre: 0 }; // Varsayılan değeri ekledik
    serverData.pre = status;
    database[serverId] = serverData;
    updateDatabase(database);
}

function getPremiumStatus(serverId) {
    const database = getDatabase();
    return (database[serverId] && database[serverId].pre) || 0;
}


client.once("ready", () => {
    console.log("Bot is ready! By Byeco");

    // 1.5 günde bir veritabanını sıfırla (1000 * 60 * 60 * 24 * 1.5 ms)
    setInterval(() => {
        const database = getDatabase();

        // Tüm sunucuların verilerini sıfırla
        Object.keys(database).forEach((serverId) => {
            database[serverId].hak = 0;
        });

        updateDatabase(database);
        console.log("Veritabanı sıfırlandı.");
    }, 1000 * 60 * 60 * 24 * 1.5);
});

client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.mentions.has(client.user)) return;

    // Etiket içinde belirli bir anahtarı kontrol et
    if (message.content.includes("hak-kontrol-et")) {
        const serverId = message.guild.id; // Sunucu ID'sini al
        const database = getDatabase();
        const serverData = database[serverId] || { hak: 0, pre: 0 }; // Sunucu verilerini al, eğer yoksa varsayılan olarak { hak: 0, pre: 0 } kullan
        message.reply(`Sunucunun hak sayısı: ${serverData.hak}`);
        return;
    }

    const serverId = message.guild.id; // Sunucu ID'sini al
    const database = getDatabase();
    const serverData = database[serverId] || { hak: 0, pre: 0 }; // Sunucu verilerini al, eğer yoksa varsayılan olarak { hak: 0, pre: 0 } kullan
    serverData.hak++; // Hak sayısını arttır
    database[serverId] = serverData; // Veritabanını güncelle
    updateDatabase(database);

    if (serverData.hak === 200 && serverData.pre !== 1) {
        // Veritabanında kontrol et
        const serverDataFromDatabase = getDatabase()[serverId] || { hak: 0, pre: 0 };
        if (serverDataFromDatabase.hak === 200 && serverDataFromDatabase.pre !== 1) {
            message.reply("Uyarı! Bu sunucuda 200 defa kullanıldı. Premium alarak sınırsız kullanım hakkı elde edebilirsiniz.");
        }
    }

    const isPremium = serverData.hak >= 50;
    const maxAttempts = isPremium ? 200 : 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const chat = model.startChat({
                history: [
                    {
                        role: "user",
                        parts: message.content,
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
                if (generatedText.length > 2000) {
                    console.warn("Generated text exceeds Discord's 2000 character limit.");
                    // Hak kontrolü ekle
                    if (serverData.hak < 200) {
                        message.reply(generatedText.substring(0, 2000));
                    } else {
                        message.reply("Uyarı! Bu sunucuda 200 defa kullanıldı. Premium alarak sınırsız kullanım hakkı elde edebilirsiniz.");
                    }
                } else {
                    // Hak kontrolü ekle
                    if (serverData.hak < 200) {
                        message.reply(generatedText);
                    } else {
                        message.reply("Uyarı! Bu sunucuda 200 defa kullanıldı. Premium alarak sınırsız kullanım hakkı elde edebilirsiniz.");
                    }
                }
            } else {
                console.warn("Generated text is empty. Not sending the reply.");
            }
            return; // Herhangi bir yanıt verildiyse işlemi sonlandır
        } catch (error) {
            console.error(`Error generating response (Attempt ${attempt}):`, error);
    
            if (error instanceof GoogleGenerativeAIResponseError && error.response && error.response.promptFeedback && error.response.promptFeedback.safetyRatings) {
                console.warn("Generated content was blocked due to safety concerns.");
                break;
            }
        }
    }
    // Başarılı olamazsa veya güvenlik nedeniyle engellenirse
    message.reply("Şu an bir sorun var veya güvenlik nedeniyle engellendi, ama normal kısa konuşma yapabilirsiniz.");
});

client.login('MTIwOTE3NDE4NTk1NjYxNDE5NA.GX6Bfr.udr2DidxKEiqLaXWKV1909N89bSufHjcFzTjQk');
