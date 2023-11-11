import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "active_application" })
export class ActiveApplication {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    userId: string;

    @Column({ nullable: true })
    robloxUsername: string;

    @Column()
    active: boolean;

    @Column()
    applicationName: string;

    @Column()
    startTimestamp: string;

    @Column({ nullable: true })
    endTimestamp: string;
}
