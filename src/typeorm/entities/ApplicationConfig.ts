import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "application_config" })
export class ApplicationConfig {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    guildId: string;

    @Column()
    channelId: string;

    @Column()
    messageIds: string;
}
