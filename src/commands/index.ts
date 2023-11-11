import {
    REST,
    RESTPostAPIApplicationCommandsJSONBody,
    Routes
} from "discord.js";

import { LogError } from "../util/functions";

// Slash Commands
import { RankGetRankCommand } from "./interaction/ranks/getRank";
import { GroupSlashCommand } from "./interaction/group";
import { ApplicationSlashCommand } from "./interaction/applications";
import { DeveloperRequestCommand } from "./interaction/utility/devRequest";

// Constants
const { CLIENT_ID, BOT_TOKEN } = process.env;

const rest = new REST({ version: "10" }).setToken(BOT_TOKEN!);

const ApplicationCommands: RESTPostAPIApplicationCommandsJSONBody[] = [
    RankGetRankCommand,
    GroupSlashCommand,
    ApplicationSlashCommand,
    DeveloperRequestCommand
];

// Functions
export async function RegisterApplicationCommands(): Promise<void> {
    try {

        await rest.put(Routes.applicationCommands(CLIENT_ID!), { body: ApplicationCommands });

    } catch (error: any) {
        await LogError(error);
        return;
    }
}
