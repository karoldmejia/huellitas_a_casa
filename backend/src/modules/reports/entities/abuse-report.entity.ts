import {Entity,Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn,} from 'typeorm';
import { Report } from './report.entity';
import { AbuseReason, AbuseStatus } from '../enums/abuse.enums';

@Entity('abuse_reports')
export class AbuseReport {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'report_id', type: 'uuid' })
    reportId: string;

    @ManyToOne(() => Report, (report) => report.abuseReports, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'report_id' })
    report: Report;

    @Column({ name: 'reporter_ip', length: 45, nullable: true })
    reporterIp: string | null;

    @Column({
        type: 'enum',
        enum: AbuseReason,
    })
    reason: AbuseReason;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({
        type: 'enum',
        enum: AbuseStatus,
        default: AbuseStatus.PENDING,
    })
    status: AbuseStatus;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    constructor(partial: Partial<AbuseReport>) {
        Object.assign(this, partial);
    }
}