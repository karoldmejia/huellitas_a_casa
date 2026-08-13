// src/database/migrations/1700000000000-CreateReportsTables.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReportsTables1700000000000 implements MigrationInterface {
    name = 'CreateReportsTables1700000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Habilitar PostGIS
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);

        // Crear tabla de reportes
        await queryRunner.query(`
      CREATE TABLE reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        type VARCHAR(10) NOT NULL CHECK (type IN ('LOST', 'FOUND')),
        status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESOLVED', 'HIDDEN', 'DELETED')),
        pet_name VARCHAR(100),
        species VARCHAR(50) NOT NULL CHECK (species IN ('DOG', 'CAT', 'OTHER')),
        breed VARCHAR(100),
        gender VARCHAR(10) CHECK (gender IN ('MALE', 'FEMALE', 'UNKNOWN')),
        color VARCHAR(100) NOT NULL,
        size VARCHAR(20) NOT NULL CHECK (size IN ('SMALL', 'MEDIUM', 'LARGE')),
        description TEXT,
        location GEOGRAPHY(POINT, 4326) NOT NULL,
        address_text TEXT,
        lost_at TIMESTAMP,
        found_at TIMESTAMP,
        resolved_at TIMESTAMP,
        whatsapp VARCHAR(20) NOT NULL,
        terms_accepted BOOLEAN DEFAULT FALSE,
        views_count INTEGER DEFAULT 0,
        report_count INTEGER DEFAULT 0,
        last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_reports_type_status ON reports(type, status);
      CREATE INDEX idx_reports_species ON reports(species);
      CREATE INDEX idx_reports_user_id ON reports(user_id);
      CREATE INDEX idx_reports_created_at ON reports(created_at);
      CREATE INDEX idx_reports_location ON reports USING GIST (location);
    `);

        // Crear tabla de fotos
        await queryRunner.query(`
      CREATE TABLE report_photos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
        cloudinary_url TEXT NOT NULL,
        cloudinary_public_id VARCHAR(255) NOT NULL,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_report_photos_report_id ON report_photos(report_id);
    `);

        // Crear tabla de reportes de abuso
        await queryRunner.query(`
      CREATE TABLE abuse_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
        reporter_ip VARCHAR(45),
        reason VARCHAR(50) NOT NULL CHECK (reason IN ('SPAM', 'INAPPROPRIATE', 'FALSE_INFORMATION', 'DUPLICATE', 'OTHER')),
        description TEXT,
        status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REVIEWED', 'RESOLVED', 'REJECTED')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_abuse_reports_report_id ON abuse_reports(report_id);
      CREATE INDEX idx_abuse_reports_status ON abuse_reports(status);
    `);

        // Crear función para actualizar updated_at
        await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

        await queryRunner.query(`
      CREATE TRIGGER update_reports_updated_at
      BEFORE UPDATE ON reports
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS abuse_reports;`);
        await queryRunner.query(`DROP TABLE IF EXISTS report_photos;`);
        await queryRunner.query(`DROP TABLE IF EXISTS reports;`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column();`);
    }
}