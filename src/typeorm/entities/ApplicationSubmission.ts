import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { ApplicationStatus } from "../../util/types";

@Entity({ name: "application_submission" })
export class ApplicationSubmission {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    userId: string;

    @Column()
    robloxId: string;

    @Column()
    applicationName: string;

    @Column({ type: "text" })
    answers: string;

    @Column()
    status: ApplicationStatus;

    @Column()
    messageId: string;

    @Column()
    submitTimestamp: string;

    @Column({ nullable: true })
    reviewerId: string;

    @Column({ nullable: true })
    reviewedTimestamp: string;

    @Column({ nullable: true, type: "text" })
    note: string;
}