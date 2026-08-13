import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Report } from './entities/report.entity';
import { ReportPhoto } from '../photos/entities/report-photo.entity';
import { AbuseReport } from './entities/abuse-report.entity';
import { PhotosModule } from '../photos/photos.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Report, ReportPhoto, AbuseReport]),
        PhotosModule,
        ConfigModule,
    ],
    controllers: [ReportsController],
    providers: [ReportsService],
    exports: [ReportsService],
})
export class ReportsModule { }