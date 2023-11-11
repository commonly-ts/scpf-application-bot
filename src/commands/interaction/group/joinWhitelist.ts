import { CacheType, ChatInputCommandInteraction, Client, EmbedBuilder, SlashCommandSubcommandBuilder, SlashCommandSubcommandGroupBuilder } from "discord.js";
import { HandleInteractionError, LogError } from "../../../util/functions";

import { AppDataSource } from "../../../typeorm";
import { JoinWhitelist } from '../../../typeorm/entities/JoinList';
import noblox from 'noblox.js';

import groupConfig from "../../../groupConfig.json";

const JoinWhitelistRepository = AppDataSource.getRepository(JoinWhitelist);

export async function handleJoinExceptionSubcommandGroup(
    client: Client<true>,
    interaction: ChatInputCommandInteraction<CacheType>
): Promise<void> {
    try {

        const { options, guild, user } = interaction;

        const subcommand = options.getSubcommand();

        await interaction.deferReply({ fetchReply: true, ephemeral: false });

        await fetch(`https://api.blox.link/v4/public/guilds/1156310958940094484/discord-to-roblox/${user.id}`, {
            headers: { "Authorization": process.env.BLOXLINK_KEY! },
        }).then(async (response) => {

            const json = await response.json();
            const robloxId = Number(json["robloxID"]);

            const MainGroupRank = await noblox.getRankInGroup(groupConfig.mainGroup.groupId, robloxId);

            if (MainGroupRank < 9) {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(`You do not have permission to use this feature`)
                            .setColor("Red")
                    ],
                });

                return
            } else {
                const userId = options.getString("userid");

                if (!userId || !guild) return;

                const user = await noblox.getPlayerInfo(Number(userId));
                const thumbnail = await noblox.getPlayerThumbnail(Number(userId), 720, "png", true, "headshot");

                const replyEmbed = new EmbedBuilder()
                    .setThumbnail(thumbnail[0]!["imageUrl"]!);

                switch (subcommand) {
                    case "whitelist": {
                        const ExistingException = await JoinWhitelistRepository.findOneBy({ robloxId: userId });

                        if (ExistingException) {
                            await JoinWhitelistRepository.update({ id: ExistingException.id }, {
                                whitelisted: true
                            });
                        } else {
                            const newWhitelist = JoinWhitelistRepository.create({
                                whitelisted: true,
                                robloxId: userId
                            });

                            await JoinWhitelistRepository.save(newWhitelist);
                        }

                        replyEmbed
                            .setTitle(`Whitelisted ${user.username}`)
                            .setDescription(`${user.username} can now bypass automatic acceptance.`)
                            .setColor("Green");

                        return;
                    }
                    case "blacklist": {
                        const ExistingException = await JoinWhitelistRepository.findOneBy({ robloxId: userId });

                        if (ExistingException) {
                            await JoinWhitelistRepository.update({ id: ExistingException.id }, {
                                whitelisted: false
                            });
                        } else {
                            const newWhitelist = JoinWhitelistRepository.create({
                                whitelisted: false,
                                robloxId: userId
                            });

                            await JoinWhitelistRepository.save(newWhitelist);
                        }

                        replyEmbed
                            .setTitle(`Blacklisted ${user.username}`)
                            .setDescription(`${user.username} can no longer bypass automatic acceptance.`)
                            .setColor("Red");

                        return;
                    }
                    case "remove": {
                        await JoinWhitelistRepository.delete({ robloxId: userId });

                        replyEmbed
                            .setTitle(`Removed ${user.username}`)
                            .setDescription(`${user.username} has been removed from any exceptions, they will now need to meet basic entry requirements.`)
                            .setColor("Yellow");

                        return;
                    }
                }

                await interaction.editReply({
                    embeds: [replyEmbed]
                });

                return;
            }

        }).catch(async (reason) => {
            LogError(new Error(reason));

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`An API error occured`)
                ],
            });
            return;
        });

        return;
    } catch (error: any) {
        await HandleInteractionError(error, client, interaction);
        return;
    }
}

export const GroupWhitelistSubcommandGroup = new SlashCommandSubcommandGroupBuilder()
    .setName("exception")
    .setDescription(`Manage who is blacklisted/whitelisted from joining the group.`)
    .addSubcommand((subcommand) =>
        subcommand
            .setName("whitelist")
            .setDescription(`Whitelist a user to bypass join requirements`)
            .addStringOption((option) =>
                option
                    .setName("userid")
                    .setDescription("The UserId of the player you want to whitelist")
                    .setRequired(true)
            )
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("blacklist")
            .setDescription(`Blacklist a user from joining the group completely`)
            .addStringOption((option) =>
                option
                    .setName("userid")
                    .setDescription("The UserId of the player you want to blacklist")
                    .setRequired(true)
            )
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("remove")
            .setDescription(`Remove a join exception for a user`)
            .addStringOption((option) =>
                option
                    .setName("userid")
                    .setDescription("The UserId of the player you want to remove the exception for")
                    .setRequired(true)
            )
    );
