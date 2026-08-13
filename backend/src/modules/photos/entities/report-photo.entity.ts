import {Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn} from 'typeorm';
import { Report } from '../../reports/entities/report.entity';

@Entity('report_photos')
export class ReportPhoto {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'report_id', type: 'uuid' })
    reportId: string;

    @ManyToOne(() => Report, (report) => report.photos, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'report_id' })
    report: Report;

    @Column({ name: 'cloudinary_url', type: 'text' })
    cloudinaryUrl: string;

    @Column({ name: 'cloudinary_public_id', length: 255 })
    cloudinaryPublicId: string;

    @Column({ name: 'order_index', default: 0 })
    orderIndex: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    constructor(partial: Partial<ReportPhoto>) {
        Object.assign(this, partial);
    }
}