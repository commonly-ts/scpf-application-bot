import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, CacheType, Client, ComponentType, DMChannel, EmbedBuilder, GuildMember, Message, TextChannel } from "discord.js";
import { HandleInteractionError } from "../../util/functions";

import { AppDataSource } from "../../typeorm";
import { ActiveApplication } from "../../typeorm/entities/ActiveApplication";
import { ApplicationSubmission } from "../../typeorm/entities/ApplicationSubmission";

import { Application } from "../../util/types";

import noblox from 'noblox.js';

const ActiveApplicationRepository = AppDataSource.getRepository(ActiveApplication);
const ApplicationSubmissionRepository = AppDataSource.getRepository(ApplicationSubmission);

type QuestionsReponse = {
    Question: string,
    Answer: string
}

async function sendApplicationQuestions(
    channel: DMChannel,
    application: Application,
    member: GuildMember,
    filter: (response: Message) => boolean
): Promise<QuestionsReponse[]> {
    const Responses: QuestionsReponse[] = [];

    for (const [index, question] of application.questions.entries()) {
        await channel.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`Question #${index + 1}`)
                    .setFooter({ text: `Say "Cancel" to cancel the application • You have 5 minutes to reply` })
                    .setDescription(question)
                    .setColor(0x2B2D31)
            ]
        });

        const Collected = await channel.awaitMessages({ filter, max: 1, time: 300000, errors: ["time"] });

        if (Collected.size > 0) {
            const Answer = Collected.first()!.content;

            if (Answer.toLowerCase() === "cancel") {
                return [];
            }

            Responses.push({
                Question: question,
                Answer
            });
        }

        continue;
    };

    return Responses;
}

export async function HandleApplication(
    client: Client<true>,
    interaction: ButtonInteraction<CacheType>,
    application: Application
): Promise<void> {
    try {

        const { user, guild } = interaction;
        const member = interaction.member as GuildMember;

        let hasAccess = false;
        application.allowedRoles.map((roleId) => {
            if (member.roles.cache.get(roleId)) {
                hasAccess = true;
                return;
            }
        });

        if (!hasAccess) {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setDescription(`You are not eligible to apply for ${application.label}`)
                ],
                ephemeral: true
            });
            return;
        }

        let InProgressApplication = await ActiveApplicationRepository.findOneBy({ userId: user.id, active: true });

        if (InProgressApplication) {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setDescription(`You already have an active ${InProgressApplication.applicationName}, please finish or cancel that one first`)
                ],
                ephemeral: true
            });
            return;
        }

        const pendingApplication = await ApplicationSubmissionRepository.findOneBy({ userId: user.id, status: "Pending" });

        if (pendingApplication) {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setDescription(`You already have a pending application, please wait until it is reviewed to resubmit`)
                ],
                ephemeral: true
            });
            return;
        }

        InProgressApplication = await ActiveApplicationRepository.save(ActiveApplicationRepository.create({
            userId: user.id,
            active: true,
            applicationName: application.name,
            startTimestamp: Math.round(new Date().getTime() / 1000).toString()
        }));

        await member.createDM()
            .then(async (channel) => {

                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Green")
                            .setDescription(`The application process has begun in <#${channel.id}>`)
                    ],
                    ephemeral: true
                });

                await channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle(application.name)
                            .setThumbnail(application.iconUrl)
                            .setDescription(`
**Application Systems Terms**
You understand that
- Abusing this system will result in a blacklist meaning you won't be able to apply for anything
- Troll, spam or any other malicious application counts as abuse of the system

The bot will send a message containing the question and you have 5 minutes to reply. If you fail to reply, the application will be cancelled.
If you wish to cancel the application yourself, reply with "Cancel".

**Do you wish to proceed with this application, reply with "Yes" if so or say "Cancel" to cancel.**
                            `)
                            .setColor(0xD1D1D1)
                    ]
                });

                const replyFilter = (response: Message) => response.author.id === member.user.id;
                await channel.awaitMessages({ filter: replyFilter, max: 1, errors: ["time"] })
                    .then(async (collected) => {
                        const response = collected.first();

                        if (response!.content.toLowerCase().includes("yes")) {

                            const FinalResponse = await sendApplicationQuestions(channel, application, member, replyFilter);
                            if (FinalResponse.length === application.questions.length) {

                                const confirmMessage = await channel.send({
                                    embeds: [
                                        new EmbedBuilder()
                                            .setColor("Yellow")
                                            .setDescription(`Gathering answers...`)
                                    ]
                                });

                                const response = await fetch(`https://api.blox.link/v4/public/guilds/${guild!.id}/discord-to-roblox/${user.id}`, {
                                    headers: { "Authorization": process.env.BLOXLINK_KEY! },
                                });

                                const json = await response.json();
                                const robloxId = Number(json["robloxID"]);
                                const username = await noblox.getUsernameFromId(robloxId);

                                await ActiveApplicationRepository.update({ id: InProgressApplication!.id }, {
                                    endTimestamp: Math.round(new Date().getTime() / 1000).toString(),
                                    robloxUsername: username
                                });

                                const FinalEmbed = new EmbedBuilder()
                                    .setColor("Yellow")
                                    .setTitle(`${application.name} — ${username}`)
                                    .setDescription(`Discord: ${user.username}\nRoblox: ${username}\n\n**IF YOU ARE APPLYING FOR A DEPARTMENT, ENSURE THAT YOU HAVE SENT A JOIN REQUEST PRIOR TO SUBMITTING THIS APPLICATION**`)
                                    .addFields(
                                        FinalResponse.map(({ Question, Answer }) => ({
                                            name: Question,
                                            value: Answer
                                        }))
                                    );


                                const submitButton = new ButtonBuilder()
                                    .setCustomId("SubmitApplication")
                                    .setLabel("Submit")
                                    .setStyle(ButtonStyle.Success);
                                const cancelButton = new ButtonBuilder()
                                    .setCustomId("CancelApplication")
                                    .setLabel("Cancel")
                                    .setStyle(ButtonStyle.Danger);

                                const embeds: EmbedBuilder[] = [FinalEmbed];

                                const joinRequest = await noblox.getJoinRequest(application.groupId, robloxId);
                                if (application.autoAccept === true && !joinRequest) {
                                    embeds.push(new EmbedBuilder()
                                        .setColor("Yellow")
                                        .setTitle("⚠️ Automation Warning")
                                        .setDescription(`You are required to send a join request to this group: https://www.roblox.com/groups/${application.groupId}/Group/\nIf your application is accepted and you have no sent a join request, you will not be automatically accepted into the group.`))
                                }


                                await confirmMessage.edit({
                                    embeds,
                                    components: [
                                        new ActionRowBuilder<ButtonBuilder>().setComponents(
                                            submitButton, cancelButton
                                        )
                                    ]
                                });

                                const ButtonFilter = (Button: ButtonInteraction) => Button.message.id === confirmMessage.id;
                                await channel.awaitMessageComponent({ componentType: ComponentType.Button, time: 300000, filter: ButtonFilter })
                                    .then(async (collected) => {
                                        console.log(collected.customId);
                                        switch (collected.customId) {
                                            case "SubmitApplication": {

                                                const submitGuild = client.guilds.cache.get(application.guildId)!;
                                                const submitChannel = submitGuild.channels.cache.get(application.submissionChannel) as TextChannel;

                                                const InProgressApplication = await ActiveApplicationRepository.findOneBy({ userId: user.id, active: true });
                                                const AvatarThumbnail = await noblox.getPlayerThumbnail(robloxId, "720x720", "png", false, "headshot");

                                                const SubmitEmbed = FinalEmbed;

                                                const submittedMessage = await submitChannel.send({
                                                    embeds: [
                                                        SubmitEmbed
                                                            .setThumbnail(AvatarThumbnail[0]!["imageUrl"]!)
                                                            .setTimestamp()
                                                            .setDescription(`
**Discord Username:** ${interaction.user.username} / ${interaction.user.id}
**Roblox Username** ${username} / ${robloxId}
**Roblox Profile:** https://roblox.com/users/${robloxId}/profile

**Applicatiom Begun:** <t:${InProgressApplication!.startTimestamp}:f>
**Application Submitted:** <t:${InProgressApplication!.endTimestamp}:f>
                                                            `)
                                                    ],
                                                    components: [
                                                        new ActionRowBuilder<ButtonBuilder>().setComponents(
                                                            new ButtonBuilder()
                                                                .setCustomId("AcceptApplication")
                                                                .setLabel("Accept")
                                                                .setStyle(ButtonStyle.Success),
                                                            new ButtonBuilder()
                                                                .setCustomId("DenyApplication")
                                                                .setLabel("Reject")
                                                                .setStyle(ButtonStyle.Danger),
                                                            new ButtonBuilder()
                                                                .setCustomId("AddNote")
                                                                .setLabel("Add Note")
                                                                .setStyle(ButtonStyle.Secondary)
                                                        )
                                                    ]
                                                });

                                                await ApplicationSubmissionRepository.save(ApplicationSubmissionRepository.create({
                                                    applicationName: application.name,
                                                    messageId: submittedMessage.id,
                                                    status: "Pending",
                                                    userId: user.id,
                                                    submitTimestamp: Math.round(new Date().getTime() / 1000).toString(),
                                                    answers: JSON.stringify(FinalResponse),
                                                    robloxId: robloxId.toString()
                                                }));

                                                await collected.reply({
                                                    embeds: [
                                                        new EmbedBuilder()
                                                            .setColor("Green")
                                                            .setDescription(`Successfully submitted ${application.name}`)
                                                    ]
                                                });

                                                break;
                                            }
                                            case "CancelApplication": {
                                                console.log("cancel application button");

                                                await ActiveApplicationRepository.update({ id: InProgressApplication!.id }, {
                                                    active: false,
                                                });

                                                await collected.reply({
                                                    embeds: [
                                                        new EmbedBuilder()
                                                            .setColor("Red")
                                                            .setDescription(`Cancelled application for ${application.name}`)
                                                    ]
                                                });

                                                break;
                                            }
                                        }

                                        await confirmMessage.edit({
                                            embeds: [
                                                new EmbedBuilder(confirmMessage.embeds[0]!.data).setColor("Red")
                                            ],
                                            components: [
                                                new ActionRowBuilder<ButtonBuilder>().setComponents(
                                                    submitButton.setDisabled(true), cancelButton.setDisabled(true)
                                                )
                                            ]
                                        });
                                    })
                                    .catch(async (res) => {

                                        console.log(res);

                                        await confirmMessage.edit({
                                            embeds: [
                                                FinalEmbed.setColor("Red")
                                            ],
                                            components: [
                                                new ActionRowBuilder<ButtonBuilder>().setComponents(
                                                    submitButton.setDisabled(true), cancelButton.setDisabled(true)
                                                )
                                            ]
                                        });

                                    });

                                await ActiveApplicationRepository.update({ id: InProgressApplication!.id }, {
                                    active: false,
                                });

                            } else {
                                await channel.send({
                                    embeds: [
                                        new EmbedBuilder()
                                            .setColor("Red")
                                            .setDescription(`Cancelled application process`)
                                    ]
                                });

                                await ActiveApplicationRepository.update({ id: InProgressApplication!.id }, {
                                    active: false,
                                });

                                return;
                            }

                        } else {
                            await channel.send({
                                embeds: [
                                    new EmbedBuilder()
                                        .setColor("Red")
                                        .setDescription(`Cancelled application process`)
                                ]
                            });

                            await ActiveApplicationRepository.update({ id: InProgressApplication!.id }, {
                                active: false,
                            });

                            return;
                        }
                    })
                    .catch(async () => {
                        await ActiveApplicationRepository.update({ id: InProgressApplication!.id }, {
                            active: false
                        });

                        await channel.send({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor("Red")
                                    .setDescription(`Ran out of time; Cancelled application process`)
                            ]
                        });
                        return;
                    });

            })
            .catch(async () => {
                const InProgressApplication = await ActiveApplicationRepository.findOneBy({ userId: user.id, active: true });
                if (InProgressApplication) {
                    await ActiveApplicationRepository.update({ id: InProgressApplication!.id }, {
                        active: false
                    });
                }

                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Red")
                            .setDescription(`Unable to direct message you, change your privacy settings to allow the bot to send you DMs.`)
                    ]
                });
                return;
            });

        return;
    } catch (error: any) {
        const InProgressApplication = await ActiveApplicationRepository.findOneBy({ userId: interaction.user.id, active: true });
        if (InProgressApplication) {
            await ActiveApplicationRepository.update({ id: InProgressApplication!.id }, {
                active: false
            });
        }

        await HandleInteractionError(error, client, interaction);
        return;
    }
}
