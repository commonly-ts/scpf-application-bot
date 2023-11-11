// import { ActionRowBuilder, AttachmentBuilder, CacheType, ChannelType, ChatInputCommandInteraction, Client, EmbedBuilder, SlashCommandSubcommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextChannel } from 'discord.js';
// import { HandleInteractionError } from "../../../util/functions";

// import { AppDataSource } from '../../../typeorm';
// import { Application } from '../../../typeorm/entities/Application';
// import { ApplicationConfig } from '../../../typeorm/entities/ApplicationConfig';

// import groupInfo from "../../../groupConfig.json";
// import noblox from 'noblox.js';
// import { DepartmentAbbreviation } from '../../../util/types';

// const ApplicationRepository = AppDataSource.getRepository(Application);
// const ApplicationConfigRepository = AppDataSource.getRepository(ApplicationConfig)

// interface MessageData {
//     embeds: EmbedBuilder[],
//     components?: ActionRowBuilder<StringSelectMenuBuilder>[]
// };

// async function GetDepartmentLogo(Department: DepartmentAbbreviation): Promise<string> {
//     let ImageUrl;

//     (await Promise.all(groupInfo.departments.map(async (Info) => {
//         if (Department === Info.abbreviation) {
//             const Thumbnail = await noblox.getLogo(Info.groupId, "420x420");
//             ImageUrl = Thumbnail;
//         }
//     })));

//     return ImageUrl || "";
// }

// export async function handleApplicationSetupSubcommand(
//     client: Client<true>,
//     interaction: ChatInputCommandInteraction<CacheType>
// ): Promise<void> {
//     try {

//         const { guildId, member, options } = interaction;

//         if (!guildId || !member) return;

//         const AppChannel = options.getChannel("channel") as TextChannel;
//         const SubmitChannel = options.getChannel("submission_channel") as TextChannel;
//         const ResultChannel = options.getChannel("results_channel") as TextChannel;

//         const ExistingApplications = await ApplicationRepository.findBy({ guildId });
//         let MessageData: MessageData = {
//             embeds: [
//                 new EmbedBuilder()
//                     .setTitle("Foundation Applications")
//                     .setDescription(`Select an application in the drop menu`)
//                     .setColor(0xD1D1D1)
//             ]
//         };

//         const SCPFLogo = await GetDepartmentLogo("SCPF");
//         if (SCPFLogo !== "") MessageData.embeds[0]!.setThumbnail(SCPFLogo);

//         if (ExistingApplications.length >= 1) {
//             MessageData.components = [
//                 new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
//                     new StringSelectMenuBuilder()
//                         .setCustomId("SelectApplication")
//                         .setPlaceholder("Select An Available Application")
//                         .addOptions(
//                             ExistingApplications.map((application) =>
//                                 new StringSelectMenuOptionBuilder()
//                                     .setLabel(application.applicationName)
//                                     .setDescription(`Apply for ${application.applicationName}`)
//                                     .setValue(application.applicationName)
//                             )
//                         )
//                 )
//             ]
//         }

//         const AppMessage = await AppChannel.send(MessageData);

//         let ExistingConfiguration = await ApplicationConfigRepository.findOneBy({ guildId });

//         if (ExistingConfiguration) {
//             await ApplicationConfigRepository.update({ id: ExistingConfiguration.id }, {
//                 channelId: AppChannel.id,
//                 resultChannelId: ResultChannel.id,
//                 submissionChannelId: SubmitChannel.id,
//                 messageId: AppMessage.id
//             });
//         } else {
//             await ApplicationConfigRepository.save(ApplicationConfigRepository.create({
//                 guildId,
//                 messageId: AppMessage.id,
//                 channelId: AppChannel.id,
//                 resultChannelId: ResultChannel.id,
//                 submissionChannelId: SubmitChannel.id,
//             }));
//         }

//         ExistingConfiguration = await ApplicationConfigRepository.findOneBy({ guildId });

//         await interaction.reply({
//             embeds: [
//                 new EmbedBuilder()
//                     .setColor("Green")
//                     .setTitle("Application Setup Complete")
//                     .setAuthor({ name: `Config Id: ${ExistingConfiguration!.id}` })
//                     .setFields([
//                         { name: `Applications Channel`, value: `${AppChannel}`, inline: true },
//                         { name: `Submission Channel`, value: `${SubmitChannel}`, inline: true },
//                         { name: `Results Channel`, value: `${ResultChannel}`, inline: true },
//                     ])
//             ]
//         });

//         return;
//     } catch (error: any) {
//         await HandleInteractionError(error, client, interaction);
//         return;
//     }
// }

// export const ApplicationSetupSubcommand = new SlashCommandSubcommandBuilder()
//     .setName("setup")
//     .setDescription("Setup application system")
//     .addChannelOption((option) =>
//         option
//             .setName("channel")
//             .setDescription("Channel where applications are posted")
//             .setRequired(true)
//             .addChannelTypes(ChannelType.GuildText)
//     )
//     .addChannelOption((option) =>
//         option
//             .setName("submission_channel")
//             .setDescription("Channel where submitted applications are posted")
//             .setRequired(true)
//             .addChannelTypes(ChannelType.GuildText)
//     )
//     .addChannelOption((option) =>
//         option
//             .setName("results_channel")
//             .setDescription("Channel where application results are posted")
//             .setRequired(true)
//             .addChannelTypes(ChannelType.GuildText)
//     );
