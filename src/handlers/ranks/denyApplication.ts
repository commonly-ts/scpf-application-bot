import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, CacheType, Client, Embed, EmbedBuilder, EmbedData, TextChannel } from "discord.js";
import noblox from "noblox.js";

import { HandleInteractionError, LogError, getUsernameOrTag } from "../../util/functions";

import { AppDataSource } from "../../typeorm";
import { RobloxApplication } from "../../typeorm/entities/RobloxApplication";

const ApplicationRepository = AppDataSource.getRepository(RobloxApplication);

function formatDate(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC'
    };

    const formattedDate = new Intl.DateTimeFormat('en-US', options)
        .format(date)
        .replace("at", "@");

    return formattedDate;
}

export async function HandleDenyApplicationButton(
    client: Client<true>,
    interaction: ButtonInteraction<CacheType>
): Promise<void> {
    try {

        await interaction.deferReply({ ephemeral: true });

        const { message, guild, channel } = interaction;
        if (!guild) throw Error("Interaction must be ran in a guild");
        if (!channel) throw Error("Interaction must be ran in a channel");

        const application = await ApplicationRepository.findOneBy({ messageId: message.id });
        if (!application) throw Error(`No application found for message id ${message.id}`);

        const appMessage = await channel.messages.fetch(application.messageId);
        if (!appMessage) throw Error("Could not find application message");

        const embed = new EmbedBuilder(appMessage.embeds[0] as EmbedData)
            .setColor("Red");

        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Red")
                    .setDescription(`Successfully denied ${application.robloxUsername}'s application`)
            ]
        });

        await appMessage.edit({
            embeds: [embed],
            components: [
                new ActionRowBuilder<ButtonBuilder>().setComponents(
                    new ButtonBuilder()
                        .setLabel(`Reviewed by ${await getUsernameOrTag(interaction.user)}`)
                        .setDisabled(true)
                        .setCustomId("Disabled0")
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setLabel(`${formatDate(new Date())} UTC`)
                        .setDisabled(true)
                        .setCustomId("Disabled1")
                        .setStyle(ButtonStyle.Secondary)
                )
            ]
        });

        const resultsChannel = guild.channels.cache.get("1157173368248864860") as TextChannel | undefined;
        const playerThumbnail = await noblox.getPlayerThumbnail(Number(application.robloxId), 420, "png", true, "bust");

        if (resultsChannel) {
            await fetch(`https://api.blox.link/v4/public/guilds/${guild.id}/roblox-to-discord/${application.robloxId}`, {
                headers: {
                    "Authorization": process.env.SCPFAIAD_BLOXLINK_KEY!
                }
            })
                .then(async (response) => await response.json())
                .then(async (data) => {
                    const userId = data.discordIDs[0];

                    await guild.members.fetch();
                    const member = guild.members.cache.get(userId);

                    const resultEmbed = new EmbedBuilder()
                        .setColor("Red")
                        .setTitle(`${application.applicationName} - Rejected`)
                        .setDescription(`${application.robloxUsername} has been rejected for the ${application.applicationName} application.`)
                        .setThumbnail(playerThumbnail[0]!["imageUrl"]!)
                        .setTimestamp();

                    const resultContent = member ? `${member}` : `${application.robloxUsername}`;

                    await resultsChannel.send({
                        content: resultContent,
                        embeds: [resultEmbed]
                    });
                    return;
                });
        }

        return;
    } catch (error: any) {
        await HandleInteractionError(error, client, interaction);
        return;
    }
}
