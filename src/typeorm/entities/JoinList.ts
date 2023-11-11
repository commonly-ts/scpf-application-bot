import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "join_whitelist" })
export class JoinWhitelist {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    robloxId: string;

    @Column()
    whitelisted: boolean;
}
