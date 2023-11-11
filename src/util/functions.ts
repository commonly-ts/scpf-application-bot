import {
    ButtonInteraction,
    CacheType,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    ModalSubmitInteraction,
    SelectMenuInteraction,
    TextChannel,
    User,
    UserContextMenuCommandInteraction,
    escapeMarkdown,
} from "discord.js";

import { writeFileSync } from "fs";

function formatDate(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Pacific/Auckland",
        timeZoneName: "short",
        year: "numeric",
        weekday: "short",
        day: "2-digit",
        month: "short"
    }

    const formattedDate = new Intl.DateTimeFormat("en-US", options).format(date);

    return formattedDate;
}

// Functions
export async function getUsernameOrTag(user: User, excludeAtSymbol?: boolean): Promise<string> {
    const prefix = excludeAtSymbol ? "" : "@";

    try {
        return `${prefix}${user.discriminator === "0" ? user.username : user.tag}`;
    } catch (error: any) {
        console.log(error);
        return `${prefix}${user.username}`;
    }
}

export async function LogError(
    error: Error
): Promise<void> {
    try {

        console.log(error);
        console.error(error);

        const errorFile = `errors/${Math.floor(Date.now() / 1000)}-${error.name}.log`;
        const data = `${formatDate(new Date)}

${error.message}

<<----------------------------------------------------->>

${error.stack!}`;

        writeFileSync(errorFile, data)

        return;
    } catch (err: any) {
        console.log(err);
        return;
    }
}

export async function HandleInteractionError(
    error: Error,
    client: Client<true>,
    interaction:
        | ChatInputCommandInteraction<CacheType>
        | ModalSubmitInteraction<CacheType>
        | ButtonInteraction<CacheType>
        | UserContextMenuCommandInteraction<CacheType>
        | SelectMenuInteraction<CacheType>
): Promise<void> {
    try {
        console.log(error);
        console.error(error);

        const errorType = interaction.isChatInputCommand() && interaction.commandName
            || interaction.isModalSubmit() && interaction.customId
            || interaction.isButton() && interaction.customId
            || interaction.isUserContextMenuCommand() && interaction.commandName;

        const errorFile = `errors/${Math.floor(Date.now() / 1000)}-${errorType}-${error.name}.log`;
        const data = `${formatDate(new Date)}

${error.message}

<<----------------------------------------------------->>

${error.stack!}`;

        writeFileSync(errorFile, data);

        const DevGuild = client.guilds.cache.get(
            process.env.DEV_SERVER!
        );
        if (!DevGuild) throw "DevGuild null";

        const LogChannel = DevGuild.channels.cache.get(
            process.env.ERROR_LOGS!
        ) as TextChannel;
        if (!LogChannel) throw "LogChannel null";

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`An error occured: ${escapeMarkdown(error.message)}`)
                        .setColor("Red"),
                ],
            });
        } else {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`An error occured: ${escapeMarkdown(error.message)}`)
                        .setColor("Red"),
                ],
                ephemeral: true,
            });
        }

        let Type: string = "N/A";
        let Name: string = "N/A";
        let Subcommand: string = "None";

        if (interaction.isChatInputCommand()) {
            Name = interaction.commandName;
            Type = "Slash Command";

            if (interaction.options) {
                if (interaction.options.getSubcommand())
                    Subcommand = interaction.options.getSubcommand();
            }
        }
        if (interaction.isButton()) {
            Name = interaction.customId;
            Type = "Message Button";
        }
        if (interaction.isModalSubmit()) {
            Name = interaction.customId;
            Type = "Modal Submit";
        }
        if (interaction.isUserContextMenuCommand()) {
            Name = interaction.commandName;
            Type = "User Context Menu";
        }
        if (interaction.isAnySelectMenu()) {
            Name = interaction.customId;
            Type = "Select Menu";
        }

        const ErrorEmbed = new EmbedBuilder()
            .setTitle(`${error.name}`).setColor("Red").setTimestamp()
            .setDescription(`**Error:** \`${error.message}\`
**Interaction Type:** \`${Type}\`

**Command Name:** \`${Name}\`
**Subcommand:** \`${Subcommand}\`

**User:** \`${interaction.user.id}\` // ${interaction.member} ${escapeMarkdown(await getUsernameOrTag(interaction.user))}
**Guild:** \`${interaction.guildId}\` // ${interaction.guild?.name}
**Channel:** \`${interaction.channelId}\` // ${interaction.channel}`);


        await LogChannel.send({ embeds: [ErrorEmbed], files: [errorFile] });

    } catch (err: any) {
        await LogError(err);
        return;
    }
}
