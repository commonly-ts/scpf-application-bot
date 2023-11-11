import "reflect-metadata";
import "dotenv/config";

import { Client, GatewayIntentBits } from 'discord.js';

import noblox from 'noblox.js';

import { handleGroupJoinRequest } from "./handlers/group/onJoinRequest";
import { RegisterApplicationCommands } from "./commands";
import { onClientReady } from "./handlers/client/onReady";
import { handleOnRankChange } from "./handlers/group/onRankChange";
import { AppDataSource } from "./typeorm";
import { MessageCreate } from "./handlers/client/messageCreate";
import { LogError } from "./util/functions";

const { ROBLOX_TOKEN, BOT_TOKEN } = process.env;

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages] });

client.on("ready", onClientReady);
client.on("messageCreate", async (message) => {
    await MessageCreate(client, message);
});

client.on("interactionCreate", async (interaction) => {
    if (interaction.isChatInputCommand()) {
        client.emit("handleInteractionCommand", interaction);
    } else if (interaction.isButton()) {
        client.emit("handleButtonInteraction", interaction);
    }
});


async function main() {
    try {

        await client.login(BOT_TOKEN!);
        await noblox.setCookie(ROBLOX_TOKEN!);

        await RegisterApplicationCommands();

        await handleOnRankChange(client);
        await handleGroupJoinRequest(client);

        await AppDataSource.initialize();

    } catch (error: any) {
        await LogError(error);
        return;
    }
}

main();
