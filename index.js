const { GoogleGenerativeAI, GoogleGenerativeAIResponseError } = require("@google/generative-ai");
const { Client, Intents } = require("discord.js");

const genAI = new GoogleGenerativeAI("AIzaSyDMzVF2QEE_P-gQYtVSFy7fEit42OA0y-4");
const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MEMBERS
    ],
});



client.once("ready", () => {
    console.log("Bot is ready!");
});

client.on("messageCreate", async (message) => {
    // Ignore messages from the bot itself
    if (message.author.bot) return;

    // Check if the message mentions the bot
    if (message.mentions.has(client.user)) {
        let success = false;
        let generatedText = "";

        // Try multiple times
        for (let attempt = 1; attempt <= 3; attempt++) {
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
                            parts: "", // You can leave this empty or provide a prompt for the model
                        },
                    ],
                    generationConfig: {
                        maxOutputTokens: 1000000,
                    },
                });

                const result = await chat.sendMessage(message.content);
                const response = await result.response;
                generatedText = response.text();

                // If reached here without errors, set success to true and break the loop
                success = true;
                break;
            } catch (error) {
                console.error(`Error generating response (Attempt ${attempt}):`, error);

                // Check if the error is due to safety block
                if (error instanceof GoogleGenerativeAIResponseError && error.response && error.response.promptFeedback && error.response.promptFeedback.safetyRatings) {
                    console.warn("Generated content was blocked due to safety concerns.");
                    break; // Break the loop if blocked for safety
                }
            }
        }

        if (success) {
            // Check if generatedText is not empty before replying
            if (generatedText.trim() !== "") {
                // Check if the generated text exceeds Discord's character limit
                if (generatedText.length > 2000) {
                    console.warn("Generated text exceeds Discord's 2000 character limit.");
                    generatedText = generatedText.substring(0, 2000); // Trim the text to 2000 characters
                }

                // Reply with the generated text
                message.reply(generatedText);
            } else {
                console.warn("Generated text is empty. Not sending the reply.");
            }
        } else {
            // If unsuccessful after multiple attempts or blocked for safety, inform the user
            message.reply("Şu an bir sorun var veya güvenlik nedeniyle engellendi, ama normal kısa konuşma yapabilirsiniz.");
        }
    }
});

client.login('MTIwOTE3NDE4NTk1NjYxNDE5NA.GX6Bfr.udr2DidxKEiqLaXWKV1909N89bSufHjcFzTjQk');
