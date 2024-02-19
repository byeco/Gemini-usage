const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Client,  Intents } = require("discord.js");

const genAI = new GoogleGenerativeAI("AIzaSyDMzVF2QEE_P-gQYtVSFy7fEit42OA0y-4");
const client = new Client({
    intents: [
      Intents.FLAGS.GUILDS,
      Intents.FLAGS.GUILD_MESSAGES,
      Intents.FLAGS.GUILD_MEMBERS // Katılma ve ayrılma olaylarını izlemek için
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
          maxOutputTokens: 100,
        },
      });

      const result = await chat.sendMessage(message.content);
      const response = await result.response;
      const text = response.text();

      // Reply with the generated text
      message.reply(text);
    } catch (error) {
      console.error("Error generating response:", error);

      if (error instanceof GoogleGenerativeAI.Error && error.code === 400) {
        message.reply("Please ensure that multiturn requests alternate between user and model.");
      } else {
        message.reply("An error occurred while generating a response.");
      }
    }
  }
});

client.login('MTE4NTIzODQ5Mzc0MDQwMDY4Mw.G0K06j.MoCN991DmBIPB9Zs4lNRKoYbQmaRthxEYtLwLQ');
