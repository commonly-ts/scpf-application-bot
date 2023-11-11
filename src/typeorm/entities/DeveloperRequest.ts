import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "developer_request" })
export class DeveloperRequest {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    userId: string;

    @Column()
    submittedTimestamp: string;

    @Column({ type: "text" })
    request: string;

    @Column()
    messageId: string;
}
