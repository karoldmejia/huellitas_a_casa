import {Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AbuseReport } from './abuse-report.entity';
import { ReportPhoto } from '../../photos/entities/report-photo.entity';
import { Gender, ReportStatus, ReportType, Size, Species } from '../enums/report.enums';

@Entity('reports')
@Index(['type', 'status'])
@Index(['species', 'size'])
export class Report {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'uuid', nullable: true })
    @Index()
    userId: string | null;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'user_id' })
    user: User | null;

    @Column({
        type: 'enum',
        enum: ReportType,
        name: 'type',
    })
    @Index()
    type: ReportType;

    @Column({
        type: 'enum',
        enum: ReportStatus,
        default: ReportStatus.ACTIVE,
    })
    @Index()
    status: ReportStatus;

    // Información de la mascota
    @Column({ name: 'pet_name', nullable: true, length: 100 })
    petName: string | null;

    @Column({
        type: 'enum',
        enum: Species,
    })
    @Index()
    species: Species;

    @Column({ nullable: true, length: 100 })
    breed: string | null;

    @Column({
        type: 'enum',
        enum: Gender,
        nullable: true,
    })
    gender: Gender | null;

    @Column({ length: 100 })
    color: string;

    @Column({
        type: 'enum',
        enum: Size,
    })
    size: Size;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    // Ubicación (PostGIS)
    @Column({
        type: 'geography',
        spatialFeatureType: 'Point',
        srid: 4326,
        nullable: false,
    })
    @Index({ spatial: true })
    location: any; // Point

    @Column({ name: 'address_text', nullable: true })
    addressText: string | null;

    // Fechas relevantes
    @Column({ name: 'lost_at', type: 'timestamp', nullable: true })
    lostAt: Date | null;

    @Column({ name: 'found_at', type: 'timestamp', nullable: true })
    foundAt: Date | null;

    @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
    resolvedAt: Date | null;

    // Contacto
    @Column({ length: 20 })
    whatsapp: string;

    @Column({ name: 'terms_accepted', default: false })
    termsAccepted: boolean;

    // Metadata
    @Column({ name: 'views_count', default: 0 })
    viewsCount: number;

    @Column({ name: 'report_count', default: 0 })
    reportCount: number;

    @Column({ name: 'last_activity_at', type: 'timestamp', nullable: true })
    lastActivityAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relaciones
    @OneToMany(() => ReportPhoto, (photo) => photo.report, {
        cascade: true,
        eager: true, // Cargar fotos automáticamente
    })
    photos: ReportPhoto[];

    @OneToMany(() => AbuseReport, (abuse) => abuse.report)
    abuseReports: AbuseReport[];

    constructor(partial: Partial<Report>) {
        Object.assign(this, partial);
    }
}