import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CacheType, ChatInputCommandInteraction, Client, EmbedBuilder, ModalBuilder, ModalSubmitInteraction, SlashCommandBuilder, TextChannel, TextInputBuilder, TextInputStyle } from "discord.js";
import { HandleInteractionError } from "../../../util/functions";

import { AppDataSource } from "../../../typeorm";
import { DeveloperRequest } from "../../../typeorm/entities/DeveloperRequest";
import noblox from 'noblox.js';

const DeveloperRequestRepository = AppDataSource.getRepository(DeveloperRequest);

export async function handleDeveloperRequestSlashCommand(
    client: Client<true>,
    interaction: ChatInputCommandInteraction<CacheType>
): Promise<void> {
    try {

        const DevGuild = client.guilds.cache.get("1146366103912726528")!;
        const RequestsChannel = DevGuild.channels.cache.get("1172130550857863219")! as TextChannel;

        const response = await fetch(`https://api.blox.link/v4/public/guilds/${interaction.guild!.id}/discord-to-roblox/${interaction.user.id}`, {
            headers: { "Authorization": process.env.BLOXLINK_KEY! },
        });

        const json = await response.json();
        const robloxId = Number(json["robloxID"]);
        const username = await noblox.getUsernameFromId(robloxId);

        const Modal = new ModalBuilder()
            .setTitle("Developer Request")
            .setCustomId("DeveloperRequestModal");

        await interaction.showModal(
            Modal.setComponents(
                new ActionRowBuilder<TextInputBuilder>().setComponents(
                    new TextInputBuilder()
                        .setCustomId("DepartmentInput")
                        .setLabel("Departments")
                        .setPlaceholder("Example: DEA, EC, MTF")
                        .setMinLength(2)
                        .setMaxLength(50)
                        .setRequired(true)
                        .setStyle(TextInputStyle.Short)
                ),
                new ActionRowBuilder<TextInputBuilder>().setComponents(
                    new TextInputBuilder()
                        .setCustomId("RankInput")
                        .setLabel("Foundation Rank")
                        .setPlaceholder("Example: Level-3, Level-5")
                        .setMinLength(2)
                        .setMaxLength(25)
                        .setRequired(true)
                        .setStyle(TextInputStyle.Short)
                ),
                new ActionRowBuilder<TextInputBuilder>().setComponents(
                    new TextInputBuilder()
                        .setCustomId("RequestInput")
                        .setLabel("Request")
                        .setPlaceholder("Explain what your request is provide a reason")
                        .setMinLength(50)
                        .setMaxLength(4000)
                        .setRequired(true)
                        .setStyle(TextInputStyle.Paragraph)
                )
            )
        );

        const filter = (modal: ModalSubmitInteraction) => modal.customId === "DeveloperRequestModal" && modal.user.id === interaction.user.id;
        await interaction.awaitModalSubmit({ time: 1800000, filter, dispose: true })
            .then(async (modal) => {
                const Departments = modal.fields.getTextInputValue("DepartmentInput");
                const Rank = modal.fields.getTextInputValue("RankInput");
                const Request = modal.fields.getTextInputValue("RequestInput");

                const Embed = new EmbedBuilder()
                    .setTitle(`Request From ${username} / ${modal.user.username}`)
                    .setThumbnail(modal.user.avatarURL())
                    .setDescription(Request)
                    .setURL(`https://roblox.com/users/${robloxId}/profile`)
                    .setFields(
                        { name: "Rank", value: Rank, inline: true },
                        { name: "Department(s)", value: Departments, inline: true }
                    );

                const RequestMessage = await RequestsChannel.send({
                    embeds: [
                        Embed
                    ],
                    components: [
                        new ActionRowBuilder<ButtonBuilder>().setComponents(
                            new ButtonBuilder()
                                .setCustomId("DevRequestReply")
                                .setLabel("Reply")
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji("🗣️")
                        )
                    ]
                });

                await DeveloperRequestRepository.save(DeveloperRequestRepository.create({
                    userId: modal.user.id,
                    request: Request,
                    messageId: RequestMessage.id,
                    submittedTimestamp: Math.round(new Date().getTime() / 1000).toString()
                }));

                await modal.reply({
                    content: "Request submitted, you will recieve a reply in your DMs within 24-48 hours",
                    ephemeral: true
                });

                return;
            })
            .catch(async () => {
                await interaction.followUp({
                    content: "Something went wrong; an error occured or you ran out of time to submit the request",
                    ephemeral: true
                });

                return;
            });

        return;
    } catch (error: any) {
        await HandleInteractionError(error, client, interaction);
        return;
    }
}

export const DeveloperRequestCommand = new SlashCommandBuilder()
    .setName("developerrequest")
    .setDescription("Make a request to the bot developer for changes & feedback")
    .toJSON();
