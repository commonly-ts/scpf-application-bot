import { ActionRowBuilder, ButtonInteraction, CacheType, ChatInputCommandInteraction, Client, EmbedBuilder, ModalBuilder, ModalSubmitInteraction, TextInputBuilder, TextInputStyle } from "discord.js";

// Buttons
import { HandleAcceptApplicationButton } from "./ranks/acceptApplication";
import { HandleDenyApplicationButton } from "./ranks/denyApplication";

// Slash Commands
import { handleGetRankCommand } from "../commands/interaction/ranks/getRank";
import { handleGroupSlashCommand } from "../commands/interaction/group";
import { handleApplicationSlashCommand } from "../commands/interaction/applications";
import { handleDeveloperRequestSlashCommand } from "../commands/interaction/utility/devRequest";
import { HandleApplication } from "./applications/applications";

import applications from "../applications.json";

import { AppDataSource } from "../typeorm";
import { ActiveApplication } from '../typeorm/entities/ActiveApplication';
import { DeveloperRequest } from "../typeorm/entities/DeveloperRequest";
import { handleApplicationSubmissionButtons } from "./applications/reviewApplication";
import { ApplicationSubmission } from "../typeorm/entities/ApplicationSubmission";

const ActiveApplicationRepository = AppDataSource.getRepository(ActiveApplication);
const DeveloperRequestRepository = AppDataSource.getRepository(DeveloperRequest);
const ApplicationSubmissionRepository = AppDataSource.getRepository(ApplicationSubmission)

export async function listenForCommands(
    client: Client<true>,
): Promise<void> {
    try {

        client.on("handleInteractionCommand", async (interaction: ChatInputCommandInteraction<CacheType>) => {
            switch (interaction.commandName) {
                case "getrank": {
                    await handleGetRankCommand(client, interaction);
                    return;
                }
                case "group": {
                    await handleGroupSlashCommand(client, interaction);
                    return;
                }
                case "application": {
                    await handleApplicationSlashCommand(client, interaction);
                    return;
                }
                case "developerrequest": {
                    await handleDeveloperRequestSlashCommand(client, interaction);
                    return;
                }
            }

            return;
        });

        client.on("handleButtonInteraction", async (interaction: ButtonInteraction<CacheType>) => {
            switch (interaction.customId) {
                case "AcceptApplication": {
                    //await HandleAcceptApplicationButton(client, interaction);
                    await handleApplicationSubmissionButtons(client, interaction);
                    return;
                }
                case "DenyApplication": {
                    //await HandleDenyApplicationButton(client, interaction);
                    await handleApplicationSubmissionButtons(client, interaction);
                    return;
                }
                case "DevRequestReply": {
                    const DevRequest = await DeveloperRequestRepository.findOneBy({ messageId: interaction.message.id });
                    if (!DevRequest) return;

                    const Modal = new ModalBuilder()
                        .setTitle("Request Response")
                        .setCustomId("RequestReplyModal");

                    await interaction.showModal(
                        Modal.setComponents(
                            new ActionRowBuilder<TextInputBuilder>().setComponents(
                                new TextInputBuilder()
                                    .setCustomId("N/A")
                                    .setLabel("Developer Request")
                                    .setValue(DevRequest.request)
                                    .setRequired(false)
                                    .setStyle(TextInputStyle.Paragraph)
                            ),
                            new ActionRowBuilder<TextInputBuilder>().setComponents(
                                new TextInputBuilder()
                                    .setCustomId("ResponseInput")
                                    .setLabel("Request Response")
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Paragraph)
                            )
                        )
                    );

                    const filter = (modal: ModalSubmitInteraction) => modal.customId === "RequestReplyModal";
                    await interaction.awaitModalSubmit({ time: 1800000, filter, dispose: true })
                        .then(async (modal) => {
                            const Response = modal.fields.getTextInputValue("ResponseInput");
                            const user = client.users.cache.get(DevRequest.userId);

                            if (user) {
                                await user.createDM()
                                    .then(async (channel) => {

                                        await channel.send({
                                            embeds: [
                                                new EmbedBuilder()
                                                    .setTitle("Your Request")
                                                    .setColor("Green")
                                                    .setDescription(DevRequest.request)
                                                    .addFields({ name: "Date Submitted", value: `<t:${DevRequest.submittedTimestamp}:f>` }),
                                                new EmbedBuilder()
                                                    .setTitle("Developer's Response")
                                                    .setColor(0x2B2D31)
                                                    .setDescription(Response)
                                                    .addFields({ name: "Date Replied", value: `<t:${Math.round(new Date().getTime() / 1000).toString()}:f>` })
                                            ]
                                        });

                                        await interaction.followUp({
                                            content: "Reply sent",
                                            ephemeral: true
                                        });

                                    })
                                    .catch(async () => {
                                        await interaction.followUp({
                                            content: "Something went wrong; unable to create DM with this user",
                                            ephemeral: true
                                        });
                                    });
                            }

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
                }
                case "CancelApplication": {
                    const InProgressApplication = await ActiveApplicationRepository.findOneBy({ userId: interaction.user.id, active: true });

                    if (InProgressApplication) {
                        await ActiveApplicationRepository.update({ id: InProgressApplication.id }, {
                            active: false
                        });

                        await interaction.reply({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor("Red")
                                    .setDescription(`Cancelled application process`)
                            ]
                        });
                    }

                    return;
                }

                case "AddNote": {
                    const Submission = await ApplicationSubmissionRepository.findOneBy({ messageId: interaction.message.id, status: "Pending" });
                    if (!Submission) return;

                    const Modal = new ModalBuilder()
                        .setTitle("Application Note")
                        .setCustomId("AppNote");

                    await interaction.showModal(
                        Modal.setComponents(
                            new ActionRowBuilder<TextInputBuilder>().setComponents(
                                new TextInputBuilder()
                                    .setCustomId("NoteInput")
                                    .setLabel("Note")
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Paragraph)
                            )
                        )
                    );

                    const filter = (modal: ModalSubmitInteraction) => modal.customId === "AppNote";
                    await interaction.awaitModalSubmit({ time: 1800000, filter, dispose: true })
                        .then(async (modal) => {
                            const Response = modal.fields.getTextInputValue("NoteInput");

                            await ApplicationSubmissionRepository.update({ id: Submission.id }, {
                                note: Response
                            });

                            await modal.reply({
                                content: "Successfully added note, it will be shown to the applicant when you Accept or Reject the application"
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
                }
            }

            applications.applications.clearance.map(async (app) => {
                if (app.name === interaction.customId) {
                    await HandleApplication(client, interaction, app);
                    return;
                }
            });

            applications.applications.department.map(async (app) => {
                if (app.name === interaction.customId) {
                    await HandleApplication(client, interaction, app);
                    return;
                }
            });

            return;
        });

        return;
    } catch (err: any) {
        console.log(err);
        return;
    }
}
