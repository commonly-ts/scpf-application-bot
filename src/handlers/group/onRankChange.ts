import { Client } from "discord.js";
import noblox from "noblox.js";

import groupConfig from "../../groupConfig.json";
import { LogError } from "../../util/functions";

export async function handleOnRankChange(
    client: Client<true>,
): Promise<void> {
    try {

        // console.log("AAAAAAAAAA");

        // const auditEvent = noblox.onAuditLog(32906859);

        // auditEvent.on("data", async function (data) {
        //     console.log(data);
        // });

        // groupConfig.departments.forEach(async ({ groupId, ranks }) => {

        //     const auditEvent = noblox.onAuditLog(32906859);

        //     auditEvent.on("data", async function (data) {
        //         console.log(data);
        //     });

        // });

        return;
    } catch (error: any) {
        await LogError(error);
        return;
    }
}
