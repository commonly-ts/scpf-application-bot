import { ButtonStyle, Client, TextChannel, ActionRowBuilder, ButtonBuilder, ActivityType } from "discord.js";
import { listenForCommands } from "..";
import { LogError } from "../../util/functions";

import { AppDataSource } from "../../typeorm";
import { ActiveApplication } from "../../typeorm/entities/ActiveApplication";
import { ApplicationConfig } from "../../typeorm/entities/ApplicationConfig";

import applications from "../../applications.json";

const ActiveApplicationRepository = AppDataSource.getRepository(ActiveApplication);
const ApplicationConfigRepository = AppDataSource.getRepository(ApplicationConfig);

function ChunkArray<T>(array: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(array.length / size) }, (_, index) =>
        array.slice(index * size, index * size + size)
    );
}

export async function onClientReady(
    client: Client<true>,
): Promise<void> {
    try {

        console.log(`Successfully logged into ${client.user.tag}`);

        await listenForCommands(client);

        const DevGuild = client.guilds.cache.get(process.env.DEV_SERVER!);
        if (!DevGuild) throw "DevGuild null";

        const LogChannel = DevGuild.channels.cache.get("1170195729193652235") as TextChannel;
        if (!LogChannel) throw "LogChannel null";

        await LogChannel.send({ content: `Successfully logged into ${client.user.tag}` });

        client.user.setPresence({
            status: "online",
            activities: [{ name: "/GetRank and /DeveloperRequest", type: ActivityType.Watching }]
        });

        await ActiveApplicationRepository.findBy({ active: true })
            .then(async (ActiveApps) => {
                if (ActiveApps.length > 0) {
                    ActiveApps.map(async (app) => {
                        await ActiveApplicationRepository.update({ id: app.id }, {
                            active: false
                        });
                    });
                }
            })
            .catch(() => {

            });

        const ApplicationGuild = client.guilds.cache.get(applications.config.mainGuildId)!;
        const ApplicationsChannel = ApplicationGuild.channels.cache.get(applications.config.applicationsChannelId) as TextChannel;

        const AppConfig = await ApplicationConfigRepository.findOneBy({ guildId: ApplicationGuild.id })!;
        const MessageIds: string[] = JSON.parse(AppConfig!.messageIds);

        await ApplicationsChannel.messages.fetch();
        const ClearanceApplicationsMessage = ApplicationsChannel.messages.cache.get(MessageIds[1]!)!;
        const DepartmentApplicationsMessage = ApplicationsChannel.messages.cache.get(MessageIds[2]!)!;

        const ChunkedDepartmentApps = ChunkArray(applications.applications.department, 3);
        const DepartmentActionRows = ChunkedDepartmentApps.map((chunk) => {
            const Buttons = chunk.map((application) =>
                new ButtonBuilder()
                    .setCustomId(application.name)
                    .setLabel(application.label)
                    .setEmoji(application.emoji)
                    .setDisabled(application.closed)
                    .setStyle(ButtonStyle.Secondary)
            );

            return new ActionRowBuilder<ButtonBuilder>().setComponents(Buttons);
        });

        const CleranceData = {
            components: [
                new ActionRowBuilder<ButtonBuilder>().setComponents(
                    applications.applications.clearance.map((application) =>
                        new ButtonBuilder()
                            .setCustomId(application.name)
                            .setLabel(application.label)
                            .setEmoji(application.emoji)
                            .setDisabled(application.closed)
                            .setStyle(ButtonStyle.Secondary)
                    )
                )
            ]
        }

        const DepartmentData = {
            components: [
                ...DepartmentActionRows
            ]
        };

        await ClearanceApplicationsMessage.edit(CleranceData);
        await DepartmentApplicationsMessage.edit(DepartmentData);

        return;
    } catch (error: any) {
        await LogError(error);
        return;
    }
}