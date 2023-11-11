import { DataSource } from "typeorm";

import { JoinWhitelist } from "./entities/JoinList";
import { ApplicationConfig } from "./entities/ApplicationConfig";
import { ApplicationSubmission } from "./entities/ApplicationSubmission";
import { ActiveApplication } from "./entities/ActiveApplication";
import { DeveloperRequest } from "./entities/DeveloperRequest";

export const AppDataSource = new DataSource({
    type: "mysql",

    username: process.env.MYSQL_USERNAME,
    password: process.env.MYSQL_PASSWORD,
    port: parseInt(process.env.MYSQL_PORT || "3306"),
    database: process.env.MYSQL_DB,

    synchronize: true,
    entities: [
        JoinWhitelist,
        ApplicationConfig,
        ApplicationSubmission,
        ActiveApplication,
        DeveloperRequest
    ],
});
