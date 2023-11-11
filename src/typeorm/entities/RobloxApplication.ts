import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "roblox_application" })
export class RobloxApplication {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    robloxId: string;

    @Column()
    robloxUsername: string;

    @Column()
    applicationName: string;

    @Column()
    questions: string;

    @Column({ nullable: true })
    acceptanceRank: number;

    @Column({ unique: true, nullable: true })
    messageId: string;
}
