import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';

export enum UserRole {
    USER = 'USER',
    ADMIN = 'ADMIN',
}

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'google_id', unique: true, nullable: true })
    @Index()
    googleId: string;

    @Column({ unique: true })
    @Index()
    email: string;

    @Column({ name: 'display_name', nullable: true })
    displayName: string;

    @Column({ name: 'photo_url', nullable: true })
    photoUrl: string;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.USER,
    })
    role: UserRole;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @Column({ name: 'last_login', type: 'timestamp', nullable: true })
    lastLogin: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relaciones (se agregarán cuando tengamos Reports)
    // @OneToMany(() => Report, (report) => report.user)
    // reports: Report[];

    constructor(partial: Partial<User>) {
        Object.assign(this, partial);
    }
}