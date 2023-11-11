import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, EmbedBuilder, Message, TextChannel, escapeMarkdown } from "discord.js";
import noblox from "noblox.js";

import { AppDataSource } from '../../typeorm/index';
import { RobloxApplication } from "../../typeorm/entities/RobloxApplication";
import { LogError } from "../../util/functions";

const ApplicationRepository = AppDataSource.getRepository(RobloxApplication);

export async function MessageCreate(
    client: Client<true>,
    message: Message
): Promise<void> {
    try {

        if (message.channelId !== "1156756166576189481") return;
        if (!message.webhookId) return;

        const SCPFGuild = client.guilds.cache.get("1139416098614292590");
        if (!SCPFGuild) throw Error("No SCPF guild found");

        const ApplicationsChannel = SCPFGuild.channels.cache.get("1156755129282875504") as TextChannel | undefined;
        if (!ApplicationsChannel) throw Error("No app channel found");

        const { content } = message;

        interface Application {
            Username: string,
            UserId: number,
            Application: string,
            AcceptanceRank?: number,
            Questions: Question[]
        }

        type Question = {
            Title: string,
            Answer: string
        }

        const applicationJson = JSON.parse(content) as Application;

        let newApplication = ApplicationRepository.create({
            robloxId: applicationJson.UserId.toString(),
            robloxUsername: applicationJson.Username,
            applicationName: applicationJson.Application,
            acceptanceRank: applicationJson.AcceptanceRank,
            questions: JSON.stringify(applicationJson.Questions)
        });

        newApplication = await ApplicationRepository.save(newApplication);

        const playerThumbnail = await noblox.getPlayerThumbnail(Number(newApplication.robloxId), 420, "png", true, "bust");

        const appMessage = await ApplicationsChannel.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`${newApplication.applicationName} - ${newApplication.robloxUsername}`)
                    .setColor("Yellow")
                    .setAuthor({ name: `View Profile`, url: `https://roblox.com/users/${newApplication.robloxId}/profile`, iconURL: `https://cdn.discordapp.com/attachments/1094123407144145089/1139492024295358585/Main_SCP.png` })
                    .setDescription(`UserId: ${newApplication.robloxId}\nUsername: ${newApplication.robloxUsername}\nApplication: ${newApplication.applicationName}`)
                    .setThumbnail(playerThumbnail[0]!["imageUrl"]!)
                    .setTimestamp()
                    .setFields(
                        applicationJson.Questions.map((question) => ({
                            name: question.Title,
                            value: question.Answer
                        }))
                    )
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().setComponents(
                    new ButtonBuilder()
                        .setCustomId("AcceptApplication")
                        .setLabel("Accept")
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId("DenyApplication")
                        .setLabel("Deny")
                        .setStyle(ButtonStyle.Danger)
                )
            ]
        });

        await ApplicationRepository.update({ id: newApplication.id }, { messageId: appMessage.id });

    } catch (error: any) {
        await LogError(error);
        return;
    }
}