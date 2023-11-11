import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CacheType, ChatInputCommandInteraction, Client, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, TextChannel } from "discord.js";
import { HandleInteractionError } from "../../../util/functions";

export async function handleSetupRankingCommand(
    client: Client<true>,
    interaction: ChatInputCommandInteraction<CacheType>
): Promise<void> {
    try {

        const { guild } = interaction;

        if (!guild) return;

        const rankingChannel = guild.channels.cache.get("1140517885500997713") as TextChannel;

        const embed = new EmbedBuilder()
            .setTitle(`Ranking Center`)
            .setDescription(`Press the button below to update your clearance in accordance with your department ranks.`)
            .setAuthor({ name: "SCP Foundation - Ranking Center", iconURL: `https://cdn.discordapp.com/attachments/1094123407144145089/1139492024295358585/Main_SCP.png` });

        const components: ActionRowBuilder<ButtonBuilder>[] = [
            new ActionRowBuilder<ButtonBuilder>().setComponents(
                new ButtonBuilder()
                    .setCustomId("ClaimClearance")
                    .setLabel("Update Clearance")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId("PromptRetire")
                    .setLabel("Retire")
                    .setStyle(ButtonStyle.Danger)
            )
        ];

        await rankingChannel.send({
            embeds: [embed],
            components,
        });

        return;
    } catch (error: any) {
        await HandleInteractionError(error, client, interaction);
        return;
    }
}

export const SetupRankingCommand = new SlashCommandBuilder()
    .setName("setup_ranking")
    .setDescription("Setup the ranking center")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON();
