const { MessageEmbed } = require('discord.js');

module.exports = {
    data: {
        name: 'yardım',
        description: 'Yardım komutunu gösterir.',
    },
    async execute(interaction) {
        const botAvatarURL = interaction.client.user.displayAvatarURL(); // Botun avatar URL'si

        const embed = new MessageEmbed()
            .setColor('#fb00ff')

            .addFields(
                { name: 'Tokina', value: 'Hello, I was born on February 19, 2024, I am tokina, the things I love, I love reading manga, drawing, watching anime and helping people, I think I will get along well with you.' },
                { name: '\u200B', value: '\u200B' }, // Boş alan eklemek için
                { name: 'Tokina Beta', value: 'If you would like to participate in the Tokina beta, please let <@828247413771993109> know and become a beta user!' }
            )
            .setThumbnail(botAvatarURL)
            .setFooter('Tokina - Bir ai den daha fazlası');

        await interaction.reply({ embeds: [embed] });
    },
};
