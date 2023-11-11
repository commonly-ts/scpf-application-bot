import { CacheType, ChatInputCommandInteraction, Client, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { HandleInteractionError } from "../../../util/functions";

import { GroupWhitelistSubcommandGroup, handleJoinExceptionSubcommandGroup } from "./joinWhitelist";

export async function handleGroupSlashCommand(
    client: Client<true>,
    interaction: ChatInputCommandInteraction<CacheType>
): Promise<void> {
    try {

        const { options } = interaction;

        const SubcommandGroup = options.getSubcommandGroup();

        switch (SubcommandGroup) {
            case "exception": {
                await handleJoinExceptionSubcommandGroup(client, interaction);
                return;
            }
        }

        return;
    } catch (error: any) {
        await HandleInteractionError(error, client, interaction);
        return;
    }
}

export const GroupSlashCommand = new SlashCommandBuilder()
    .setName("group")
    .setDescription(`Manage groups`)
    .addSubcommandGroup(GroupWhitelistSubcommandGroup)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    .toJSON();
