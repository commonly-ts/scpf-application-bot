import { CacheType, ChatInputCommandInteraction, Client, EmbedBuilder, GuildMember, SlashCommandBuilder, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from "discord.js";
import { HandleInteractionError } from "../../../util/functions";

import { AppDataSource } from "../../../typeorm";
import { ApplicationConfig } from "../../../typeorm/entities/ApplicationConfig";

import applications from "../../../applications.json";
import groupConfig from "../../../groupConfig.json";

const ApplicationConfigRepository = AppDataSource.getRepository(ApplicationConfig);

function ChunkArray<T>(array: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(array.length / size) }, (_, index) =>
        array.slice(index * size, index * size + size)
    );
}

export async function handleApplicationSlashCommand(
    client: Client<true>,
    interaction: ChatInputCommandInteraction<CacheType>
): Promise<void> {
    try {

        const { member, guildId } = interaction;

        if (!guildId) return;

        const guildMember = member as GuildMember;

        if (
            !guildMember.roles.cache.get("1156310959023980559") &&
            !guildMember.roles.cache.get("1159700437012848690") &&
            !guildMember.roles.cache.get("1156583848352690206") &&
            !guildMember.roles.cache.get("1146366124234129429")
        ) {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setDescription(`You do not have permission to use this command`)
                ],
                ephemeral: true
            });

            return;
        }

        const config = applications.config;
        const mainGuild = client.guilds.cache.get(config.mainGuildId);
        if (!mainGuild) throw new Error("Could not find main guild from application config");

        const applicationChannel = mainGuild.channels.cache.get(config.applicationsChannelId) as TextChannel | undefined;
        if (!applicationChannel) throw new Error("Could not find application channel from application config");

        applicationChannel.messages.cache.forEach(async (message) => {
            await message.delete();
        });

        const TitleData = {
            embeds: [
                new EmbedBuilder()
                    .setTitle("Foundation Application Centre")
                    .setDescription(`Press any application button to begin the application process in your DMs.\nPlease ensure that the bot is able to DM you otherwise you won't be able to apply for anything.`)
                    .setThumbnail(groupConfig.mainGroup.iconUrl)
                    .setColor(0xD1D1D1)
            ]
        };

        const ClearanceData = {
            embeds: [
                new EmbedBuilder()
                    .setTitle("Clearance Level Applications")
                    .setDescription("Apply for Level-0 clearance")
                    .setColor(0x2B2D31)
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().setComponents(
                    applications.applications.clearance.map((app) =>
                        new ButtonBuilder()
                            .setCustomId(app.name)
                            .setLabel(app.label)
                            .setEmoji(app.emoji)
                            .setStyle(ButtonStyle.Secondary)
                    )
                )
            ]
        };

        const ChunkedDepartmentApps = ChunkArray(applications.applications.department, 3);
        const DepartmentActionRows = ChunkedDepartmentApps.map((chunk) => {
            const Buttons = chunk.map((application) =>
                new ButtonBuilder()
                    .setCustomId(application.name)
                    .setLabel(application.label)
                    .setEmoji(application.emoji)
                    .setStyle(ButtonStyle.Secondary)
            );

            return new ActionRowBuilder<ButtonBuilder>().setComponents(Buttons);
        });

        const DepartmentData = {
            embeds: [
                new EmbedBuilder()
                    .setTitle("Department Applications")
                    .setDescription("Apply for any available departments")
                    .setColor(0x2B2D31)
            ],
            components: [
                ...DepartmentActionRows
            ]
        };

        const TitleMessage = await applicationChannel.send(TitleData);
        const ClearanceMessage = await applicationChannel.send(ClearanceData);
        const DepartmentMessage = await applicationChannel.send(DepartmentData);

        const ExistingConfig = await ApplicationConfigRepository.findOneBy({ guildId });

        if (ExistingConfig) {
            await ApplicationConfigRepository.update({ id: ExistingConfig.id }, {
                messageIds: JSON.stringify([TitleMessage.id, ClearanceMessage.id, DepartmentMessage.id]),
                channelId: applicationChannel.id,
                guildId
            });
        } else {
            await ApplicationConfigRepository.save(ApplicationConfigRepository.create({
                messageIds: JSON.stringify([TitleMessage.id, ClearanceMessage.id, DepartmentMessage.id]),
                channelId: applicationChannel.id,
                guildId
            }));
        }

        await interaction.reply({
            content: "Successfully setup applications!"
        });

        return;
    } catch (error: any) {
        await HandleInteractionError(error, client, interaction);
        return;
    }
}

export const ApplicationSlashCommand = new SlashCommandBuilder()
    .setName("application")
    .setDescription("Manage applications")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    //.addSubcommand(ApplicationSetupSubcommand)

    .toJSON();
