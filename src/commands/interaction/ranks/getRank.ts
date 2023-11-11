import { Client, ChatInputCommandInteraction, CacheType, SlashCommandBuilder, EmbedBuilder, GuildMember, TextChannel } from "discord.js";
import { HandleInteractionError, getUsernameOrTag } from "../../../util/functions";

import noblox from "noblox.js";
import groupConfig from "../../../groupConfig.json";
import groupLogos from "../../../groupLogos.json";

import { Department, DepartmentRank } from '../../../util/types';

export async function handleGetRankCommand(
    client: Client<true>,
    interaction: ChatInputCommandInteraction<CacheType>,
): Promise<void> {
    try {

        const { options, guild } = interaction;

        const member = interaction.member as GuildMember;

        const mainGuild = client.guilds.cache.get(process.env.DEV_SERVER!)!;
        const rankLogs = mainGuild.channels.cache.find((channel) => channel.name === "rank-logs")! as TextChannel;

        if (!guild) throw new Error("Command ran outside of guild");
        let specifiedUser = options.getUser("user");

        if (specifiedUser) {

            if (!member.roles.cache.has("1156310958994636851") && !member.roles.cache.has("1146366124234129429")) {
                await interaction.reply({
                    ephemeral: true,
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(`You do not have permission to update other users`)
                            .setColor("Red")
                    ],
                });

                return;
            }

        } else specifiedUser = interaction.user;

        await interaction.deferReply({ ephemeral: false });

        await fetch(`https://api.blox.link/v4/public/guilds/${guild.id}/discord-to-roblox/${specifiedUser.id}`, {
            headers: { "Authorization": process.env.BLOXLINK_KEY! },
        }).then(async (response) => {

            const json = await response.json();
            const robloxId = Number(json["robloxID"]);

            const MainGroupRank = await noblox.getRankInGroup(groupConfig.mainGroup.groupId, robloxId);

            if (MainGroupRank >= 199) {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("Unable To Grant Clearance")
                            .setDescription(`Personnel above Level-5 Clearance are unable to automatically obtain lower clearances due to bot limitations.`)
                            .setColor("Red")
                    ]
                });

                return;
            }

            const departments = groupConfig.departments;
            const groups = await noblox.getGroups(robloxId);

            const departmentRanks = (await Promise.all(groups.map(async (group) => {
                const department = departments.find(({ groupId }) => groupId === group.Id);

                if (department && department.groupId !== groupConfig.mainGroup.groupId) {
                    const { groupId, ranks } = department;

                    if (ranks) {
                        const rankInGroup = await noblox.getRankInGroup(groupId, robloxId);
                        if (!rankInGroup) return null;

                        const rank = ranks.find(({ rankId }) => rankId === rankInGroup);
                        return {
                            department,
                            rank,
                            id: rankInGroup,
                        };
                    }
                }

                return null;
            }))).filter((rankId) => rankId !== null) as { department: Department, rank: DepartmentRank, id: number }[];

            let highestRank: { department: Department, rank: DepartmentRank, id: number } | undefined;

            if (departmentRanks.length < 1) {

                highestRank = {
                    rank: {
                        rankId: 20,
                        name: "N/A",
                        equivalent: {
                            name: "Level 0",
                            rankId: 20,
                        }
                    },
                    department: {
                        abbreviation: "N/A",
                        fullName: "Departmentless",
                        groupId: 5424728,
                        iconUrl: groupLogos.SCPF,
                    },
                    id: 1,
                }

            } else {
                highestRank = departmentRanks.reduce((highest, current) => {
                    if (current.rank.equivalent.rankId > highest.rank.equivalent.rankId) {
                        return current;
                    }

                    return highest;
                });
            }

            if (highestRank) {
                const currentRank = await noblox.getRankInGroup(groupConfig.mainGroup.groupId, robloxId);

                if (currentRank === highestRank.rank.equivalent.rankId) {
                    await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle(`Clearance is Up-To-Date`)
                                .setThumbnail(highestRank.department.iconUrl)
                                .setColor("Green")
                                .addFields(
                                    {
                                        name: `Department`,
                                        value: highestRank.department.fullName,
                                        inline: true
                                    },
                                    {
                                        name: `Position`,
                                        value: highestRank.rank.name,
                                        inline: false
                                    },
                                    {
                                        name: `Clearance`,
                                        value: highestRank.rank.equivalent.name,
                                        inline: false
                                    }
                                )
                        ],
                    });

                    return;
                }

                // await noblox.setRank(
                //     groupConfig.mainGroup.groupId,
                //     robloxId,
                //     highestRank.rank.equivalent.rankId
                // );

                // let user = specifiedUser || interaction.user;
                // await fetch(`https://api.blox.link/v4/public/guilds/1139416098614292590/update-user/${user.id}`, { headers: { "Authorization": "e4a9088d-42f9-48d8-b5c5-0ead1b3827af" }, method: "POST" })
                //     .then(async (response) => await response.json())
                //     .then((data) => console.log(data));

                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle(`Clearance Granted`)
                            .setColor("Green")
                            .addFields(
                                {
                                    name: `Department`,
                                    value: highestRank.department.fullName,
                                    inline: true
                                },
                                {
                                    name: `Position`,
                                    value: highestRank.rank.name,
                                    inline: true
                                },
                                {
                                    name: `Clearance`,
                                    value: highestRank.rank.equivalent.name,
                                    inline: true
                                }
                            )
                    ],
                });

                const thumbnail = await noblox.getPlayerThumbnail(robloxId, 720, "png", true, "headshot");

                await rankLogs.send({
                    embeds: [
                        new EmbedBuilder()
                            .setAuthor({ name: `${await getUsernameOrTag(interaction.user)}`, iconURL: interaction.user.displayAvatarURL() })
                            .setTitle(`Clearance Updated`)
                            .setColor("Green")
                            .setFooter({ text: `User Id: ${interaction.user.id}` })
                            .setThumbnail(thumbnail[0]!["imageUrl"]!)
                            .setDescription(`
Roblox Id: \`${robloxId}\`
Clearance: \`${highestRank.rank.equivalent.name}\`
Department: \`${highestRank.department.fullName}\`
Position: \`${highestRank.rank.name}\`
                            `)
                    ]
                });

                return;
            } else {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(`Department rank could not be found`)
                            .setColor("Red")
                    ],
                });

                return;
            }
        }).catch(async (reason) => {
            console.log(reason);

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

export const RankGetRankCommand = new SlashCommandBuilder()
    .setName("getrank")
    .setDescription(`Retrieve your correct security clearance`)
    .addUserOption((option) =>
        option
            .setName("user")
            .setDescription(`Intended for the use of ranking another user`)
            .setRequired(false)
    )
    .toJSON();
