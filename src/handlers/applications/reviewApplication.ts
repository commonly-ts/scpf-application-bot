import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, CacheType, Client, EmbedBuilder, StringSelectMenuBuilder, TextChannel } from 'discord.js';
import { HandleInteractionError } from "../../util/functions";

import { AppDataSource } from "../../typeorm";
import { ApplicationSubmission } from '../../typeorm/entities/ApplicationSubmission';

import { applications } from "../../applications.json";
import noblox, { handleJoinRequest } from 'noblox.js';

const ApplicationSubmissionRepository = AppDataSource.getRepository(ApplicationSubmission);

function formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    const formattedHours = hours % 12 === 0 ? 12 : hours % 12;

    const formattedDate = `${day}/${month}/${year}`;
    const formattedTime = `${formattedHours}:${minutes}${ampm}`;

    return `${formattedDate} ${formattedTime}`;
}

export async function handleApplicationSubmissionButtons(
    client: Client<true>,
    interaction: ButtonInteraction<CacheType>
): Promise<void> {
    try {

        const { customId } = interaction;

        const Submission = await ApplicationSubmissionRepository.findOneBy({ messageId: interaction.message.id, status: "Pending" });
        if (!Submission) throw new Error("Could not find valid submission");

        const application = applications.clearance.find((app) => app.name === Submission.applicationName) || applications.department.find((app) => app.name === Submission.applicationName);
        if (!application) throw new Error("Could not find valid application");

        const robloxId = Number(Submission.robloxId);
        const botId = await noblox.getCurrentUser("UserID");

        const actions: string[] = [];

        switch (customId) {
            case "AcceptApplication": {

                await ApplicationSubmissionRepository.update({ id: Submission.id }, {
                    reviewerId: interaction.user.id,
                    reviewedTimestamp: Math.round(new Date().getTime() / 1000).toString(),
                    status: "Accepted"
                });

                const submissionGuild = client.guilds.cache.get(application.guildId)!;
                const submissionChannel = submissionGuild.channels.cache.get(application.submissionChannel)! as TextChannel;

                await submissionChannel.messages.fetch();
                const submitMessage = submissionChannel.messages.cache.get(Submission.messageId)!;

                const existingEmbed = new EmbedBuilder(submitMessage.embeds[0]!.data);
                existingEmbed.setColor("Green");

                await submitMessage.edit({
                    embeds: [existingEmbed],
                    components: [
                        new ActionRowBuilder<ButtonBuilder>().setComponents(
                            new ButtonBuilder()
                                .setLabel(`Reviewed by ${interaction.user.username}`)
                                .setDisabled(true)
                                .setCustomId("Disabled0")
                                .setStyle(ButtonStyle.Success),
                            new ButtonBuilder()
                                .setLabel(`${formatDate(new Date())}`)
                                .setDisabled(true)
                                .setCustomId("Disabled1")
                                .setStyle(ButtonStyle.Secondary)
                        )
                    ]
                });

                const AcceptedSubmission = await ApplicationSubmissionRepository.findOneBy({ messageId: interaction.message.id, status: "Accepted" });
                if (!AcceptedSubmission) throw new Error("Could not find valid submission");

                const joinRequest = await noblox.getJoinRequest(application.groupId, robloxId);

                if (joinRequest) {
                    await handleJoinRequest(application.groupId, robloxId, application.autoAccept);
                    actions.push("+ Accepted applicant into group");
                } else if (application.autoAccept === true) {
                    actions.push("- Failed to handle applicant join request (No join request or no bot permissions)");
                }

                if (application.autoRank > 0) {
                    const rankInGroup = await noblox.getRankInGroup(application.groupId, robloxId);
                    const botRank = await noblox.getRankInGroup(application.groupId, botId);

                    if (rankInGroup > 0 && botRank < application.autoRank && rankInGroup < application.autoRank) {
                        await noblox.setRank(application.groupId, robloxId, application.autoRank);

                        actions.push("+ Ranked applicant in group");
                    } else {
                        actions.push("- Failed to rank applicant in group (User not in group, user is above the rank or user rank above bot)");
                    }
                }

                if (application.resultsChannel.length > 0) {
                    const guild = client.guilds.cache.get(application.guildId)!;
                    const resultChannel = guild.channels.cache.get(application.resultsChannel) as TextChannel | undefined;
                    if (!resultChannel) { actions.push("Unable to send results, results hannel does not exist"); return; }

                    await resultChannel.send({
                        content: `<@${AcceptedSubmission.userId}>`,
                        embeds: [
                            new EmbedBuilder()
                                .setColor("Green")
                                .setTitle(`${application.name}`)
                                .setDescription(`${await noblox.getUsernameFromId(robloxId)}'s application has been accepted`)
                                .addFields(
                                    { name: "Reviewed By", value: `${interaction.member} - ${interaction.user.username}`, inline: true },
                                    { name: "Date Reviewed", value: `<t:${AcceptedSubmission.submitTimestamp}:f>`, inline: true },
                                    { name: "Note", value: Submission.note || "N/A", inline: true },
                                )
                        ]
                    });

                    actions.push("+ Successfully sent results");
                } else {
                    const user = client.users.cache.get(Submission.userId);

                    if (user) {

                        await user.createDM()
                            .then(async (channel) => {

                                await channel.send({
                                    embeds: [
                                        new EmbedBuilder()
                                            .setTitle(`${application.name} Results`)
                                            .setColor("Green")
                                            .setFooter({ text: "If you have any issues or believe a mistake was made, contact either the bot developer via /developerequest command or directly contact the person who reviewed your application." })
                                            .addFields(
                                                { name: "Reviewed By", value: `${interaction.member}` },
                                                { name: "Date Reviewed", value: `<t:${AcceptedSubmission.submitTimestamp}:f>` },
                                                { name: "Note", value: Submission.note || "N/A" },
                                            )
                                            .setDescription(`
Congratulations, your application has been **Accepted**.

If you applied for a department, you should:
- Be automatically accepted into it

If you applied for a clearance level, you should:
- Be automatically ranked to that rank

If either of these didn't happen, you most likely:
- Didn't send a join request prior to submitting your application or,
- You aren't in the main group to be ranked
                                        `)
                                    ]
                                });

                                actions.push("+ Successfully sent results");
                            })
                            .catch(async () => {
                                actions.push("- Unable to DM results");
                            })
                    } else {
                        actions.push("- Unable to DM results");
                    }
                }

                await interaction.reply({
                    content: `Accepted Application\nActions Taken:\n${actions.map((action) => `\n${action}`)}`,
                    ephemeral: true
                });

                return;
            }
            case "DenyApplication": {
                await ApplicationSubmissionRepository.update({ id: Submission.id }, {
                    reviewerId: interaction.user.id,
                    reviewedTimestamp: Math.round(new Date().getTime() / 1000).toString(),
                    status: "Denied"
                });

                const submissionGuild = client.guilds.cache.get(application.guildId)!;
                const submissionChannel = submissionGuild.channels.cache.get(application.submissionChannel)! as TextChannel;

                await submissionChannel.messages.fetch();
                const submitMessage = submissionChannel.messages.cache.get(Submission.messageId)!;

                const existingEmbed = new EmbedBuilder(submitMessage.embeds[0]!.data);
                existingEmbed.setColor("Red");

                await submitMessage.edit({
                    embeds: [existingEmbed],
                    components: [
                        new ActionRowBuilder<ButtonBuilder>().setComponents(
                            new ButtonBuilder()
                                .setLabel(`Reviewed by ${interaction.user.username}`)
                                .setDisabled(true)
                                .setCustomId("Disabled0")
                                .setStyle(ButtonStyle.Danger),
                            new ButtonBuilder()
                                .setLabel(`${formatDate(new Date())}`)
                                .setDisabled(true)
                                .setCustomId("Disabled1")
                                .setStyle(ButtonStyle.Secondary)
                        )
                    ]
                });

                const DeniedSubmission = await ApplicationSubmissionRepository.findOneBy({ messageId: interaction.message.id, status: "Denied" });
                if (!DeniedSubmission) throw new Error("Could not find valid submission");

                const joinRequest = await noblox.getJoinRequest(application.groupId, robloxId);

                if (joinRequest) {
                    await handleJoinRequest(application.groupId, robloxId, application.autoAccept);
                    actions.push("- Denied applicant from group");
                } else if (application.autoAccept === true) {
                    actions.push("- Failed to handle applicant join request (No join request or no bot permissions)");
                }

                if (application.resultsChannel.length > 0) {
                    const guild = client.guilds.cache.get(application.guildId)!;
                    const resultChannel = guild.channels.cache.get(application.resultsChannel) as TextChannel | undefined;
                    if (!resultChannel) { actions.push("Unable to send results, results hannel does not exist"); return; }

                    await resultChannel.send({
                        content: `<@${DeniedSubmission.userId}>`,
                        embeds: [
                            new EmbedBuilder()
                                .setColor("Red")
                                .setTitle(`${application.name} Results`)
                                .setDescription(`${await noblox.getUsernameFromId(robloxId)}'s application has been rejected`)
                                .addFields(
                                    { name: "Reviewed By", value: `${interaction.member} - ${interaction.user.username}`, inline: true },
                                    { name: "Date Reviewed", value: `<t:${DeniedSubmission.submitTimestamp}:f>`, inline: true },
                                    { name: "Note", value: Submission.note || "N/A", inline: true },
                                )
                        ]
                    });

                    actions.push("+ Successfully sent results");
                } else {
                    const user = client.users.cache.get(Submission.userId);

                    if (user) {

                        await user.createDM()
                            .then(async (channel) => {

                                await channel.send({
                                    embeds: [
                                        new EmbedBuilder()
                                            .setTitle(`${application.name} Results`)
                                            .setColor("Red")
                                            .setFooter({ text: "If you have any issues or believe a mistake was made, contact either the bot developer via /developerequest command or directly contact the person who reviewed your application." })
                                            .addFields(
                                                { name: "Reviewed By", value: `${interaction.member}` },
                                                { name: "Date Reviewed", value: `<t:${DeniedSubmission.submitTimestamp}:f>` },
                                                { name: "Note", value: Submission.note || "N/A" },
                                            )
                                            .setDescription(`
Unfortunately, your application has been **Denied**.
                                        `)
                                    ]
                                });

                                actions.push("+ Successfully sent results");
                            })
                            .catch(async () => {
                                actions.push("- Unable to DM results");
                            })
                    } else {
                        actions.push("- Unable to DM results");
                    }
                }

                await interaction.reply({
                    content: `Rejected Application\nActions Taken:\n\`\`\`diff${actions.map((action) => `\n${action}`)}\`\`\``,
                    ephemeral: true
                });

                return;
            }
        }

        return;
    } catch (error: any) {
        await HandleInteractionError(error, client, interaction);
        return;
    }
}
