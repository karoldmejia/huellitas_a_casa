import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Not } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { Report } from './entities/report.entity';
import { ReportPhoto } from '../photos/entities/report-photo.entity';
import { AbuseReport } from './entities/abuse-report.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { SearchReportDto } from './dto/search-report.dto';
import { ReportStatus, ReportType } from './enums/report.enums';
import { UpdateReportDto } from './dto/update-report.dto';
import { PhotosService } from '../photos/photos.service';
import { User } from '../users/entities/user.entity';

// Definir el tipo de archivo
interface MulterFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
    destination: string;
    filename: string;
    path: string;
}

@Injectable()
export class ReportsService {
    private readonly logger = new Logger(ReportsService.name);

    constructor(
        @InjectRepository(Report)
        private readonly reportRepository: Repository<Report>,
        @InjectRepository(ReportPhoto)
        private readonly photoRepository: Repository<ReportPhoto>,
        @InjectRepository(AbuseReport)
        private readonly abuseRepository: Repository<AbuseReport>,
        private readonly photosService: PhotosService,
        private readonly configService: ConfigService,
        private readonly dataSource: DataSource,
    ) { }

    /**
     * Crear un nuevo reporte
     */
    async create(
        createDto: CreateReportDto,
        files: MulterFile[],
        userId?: string,
    ): Promise<Report> {
        this.logger.log(`Creando reporte tipo ${createDto.type} para usuario ${userId || 'anónimo'}`);

        // Validar fotos
        if (!files || files.length === 0) {
            throw new BadRequestException('Se requiere al menos una foto');
        }

        const maxPhotos = this.configService.get<number>('photos.maxPhotos', 3);
        if (files.length > maxPhotos) {
            throw new BadRequestException(`Máximo ${maxPhotos} fotos permitidas`);
        }

        // Validar WhatsApp
        const whatsappClean = createDto.whatsapp.replace(/\D/g, '');
        if (whatsappClean.length < 10 || whatsappClean.length > 15) {
            throw new BadRequestException('Número de WhatsApp inválido');
        }

        // Validar términos
        if (!createDto.termsAccepted) {
            throw new BadRequestException('Debes aceptar los términos de contacto');
        }

        // Validar fecha no futura
        if (createDto.eventDate && new Date(createDto.eventDate) > new Date()) {
            throw new BadRequestException('La fecha no puede ser futura');
        }

        // Crear el reporte
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Validar que el usuario existe si se proporciona userId
            if (userId) {
                const userExists = await queryRunner.manager
                    .createQueryBuilder()
                    .select('1')
                    .from('users', 'user')
                    .where('user.id = :userId AND user.is_active = true', { userId })
                    .getExists();

                if (!userExists) {
                    throw new BadRequestException('Usuario no encontrado o inactivo');
                }
            }

            const report = new Report({
                userId: userId || null,
                type: createDto.type,
                status: ReportStatus.ACTIVE,
                petName: createDto.petName || null,
                species: createDto.species,
                breed: createDto.breed || null,
                gender: createDto.gender || null,
                color: createDto.color,
                size: createDto.size,
                description: createDto.description || null,
                location: () => `
          ST_SetSRID(
            ST_MakePoint(${createDto.longitude}, ${createDto.latitude}),
            4326
          )
        `,
                addressText: createDto.addressText || null,
                lostAt: createDto.type === ReportType.LOST ? (createDto.eventDate || new Date()) : null,
                foundAt: createDto.type === ReportType.FOUND ? (createDto.eventDate || new Date()) : null,
                whatsapp: whatsappClean,
                termsAccepted: createDto.termsAccepted,
                viewsCount: 0,
                reportCount: 0,
                lastActivityAt: new Date(),
            });

            const savedReport = await queryRunner.manager.save(report);

            // Subir fotos
            const photoUploads = await this.photosService.uploadPhotos(
                files,
                savedReport.id,
                queryRunner.manager,
            );

            // Crear entidades de fotos
            const photos = photoUploads.map((upload, index) =>
                queryRunner.manager.create(ReportPhoto, {
                    reportId: savedReport.id,
                    cloudinaryUrl: upload.url,
                    cloudinaryPublicId: upload.publicId,
                    orderIndex: index,
                }),
            );

            await queryRunner.manager.save(photos);

            await queryRunner.commitTransaction();

            // Obtener el reporte completo con fotos
            const completeReport = await this.findById(savedReport.id);

            this.logger.log(`Reporte ${savedReport.id} creado exitosamente`);

            return completeReport;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            this.logger.error(`Error creando reporte: ${errorMessage}`);
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Buscar reportes con filtros y paginación
     */
    async search(searchDto: SearchReportDto): Promise<{ data: Report[]; total: number }> {
        const {
            search,
            type,
            species,
            color,
            size,
            latitude,
            longitude,
            radius = 5,
            page = 1,
            limit = 20,
            sortBy = 'relevance',
        } = searchDto;

        const queryBuilder = this.reportRepository
            .createQueryBuilder('report')
            .where('report.status = :status', { status: ReportStatus.ACTIVE })
            .andWhere('report.status != :deleted', { deleted: ReportStatus.DELETED });

        // Aplicar filtros
        if (type) {
            queryBuilder.andWhere('report.type = :type', { type });
        }

        if (species) {
            queryBuilder.andWhere('report.species = :species', { species });
        }

        if (color) {
            queryBuilder.andWhere('report.color ILIKE :color', { color: `%${color}%` });
        }

        if (size) {
            queryBuilder.andWhere('report.size = :size', { size });
        }

        // Búsqueda por texto
        if (search) {
            queryBuilder.andWhere(
                `(report.pet_name ILIKE :search OR 
          report.color ILIKE :search OR 
          report.breed ILIKE :search OR 
          report.description ILIKE :search OR 
          report.address_text ILIKE :search)`,
                { search: `%${search}%` },
            );
        }

        // Ordenamiento por distancia
        if (latitude && longitude) {
            const distanceExpression = `
        ST_Distance(
          report.location::geometry,
          ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography
        )
      `;

            queryBuilder
                .addSelect(distanceExpression, 'distance')
                .andWhere(
                    `ST_DWithin(
            report.location,
            ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
            :radius
          )`,
                    { longitude, latitude, radius: radius * 1000 },
                )
                .setParameter('longitude', longitude)
                .setParameter('latitude', latitude);

            if (sortBy === 'distance') {
                queryBuilder.orderBy('distance', 'ASC');
            } else if (sortBy === 'relevance') {
                // Orden por distancia + recencia
                queryBuilder
                    .addSelect('EXTRACT(EPOCH FROM report.created_at)', 'created_at_epoch')
                    .orderBy('distance', 'ASC')
                    .addOrderBy('created_at_epoch', 'DESC');
            }
        } else {
            // Sin ubicación, ordenar por recencia
            queryBuilder.orderBy('report.created_at', 'DESC');
        }

        // Paginación
        const skip = (page - 1) * limit;
        queryBuilder.skip(skip).take(limit);

        // Cargar relaciones - CORREGIDO
        queryBuilder.leftJoinAndSelect('report.photos', 'photos');
        queryBuilder.leftJoinAndSelect('report.user', 'user');
        queryBuilder.addOrderBy('photos.order_index', 'ASC');

        const [data, total] = await queryBuilder.getManyAndCount();

        return { data, total };
    }

    /**
     * Encontrar reporte por ID
     */
    async findById(id: string): Promise<Report> {
        // CORREGIDO: Usar select y relaciones con objeto
        const report = await this.reportRepository.findOne({
            where: { 
                id, 
                status: Not(ReportStatus.DELETED) 
            },
            relations: {
                photos: true,
                user: true,
            },
            order: {
                photos: {
                    orderIndex: 'ASC' as 'ASC',
                },
            },
        });

        if (!report) {
            throw new NotFoundException('Reporte no encontrado');
        }

        // Incrementar contador de vistas
        report.viewsCount += 1;
        await this.reportRepository.save(report);

        return report;
    }

    /**
     * Actualizar reporte (solo propietario)
     */
    async update(
        id: string,
        updateDto: UpdateReportDto,
        userId: string,
        files?: MulterFile[],
    ): Promise<Report> {
        this.logger.log(`Actualizando reporte ${id}`);

        const report = await this.findById(id);

        // Verificar propiedad
        if (report.userId !== userId) {
            throw new ForbiddenException('Solo puedes editar tus propios reportes');
        }

        // No permitir editar tipo o especie
        if (updateDto.hasOwnProperty('type')) {
            delete (updateDto as any)['type'];
        }

        // Validar fecha no futura
        if (updateDto.eventDate && new Date(updateDto.eventDate) > new Date()) {
            throw new BadRequestException('La fecha no puede ser futura');
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Actualizar campos
            const updatedData: any = { ...updateDto };

            // Actualizar ubicación si se proporciona
            if (updateDto.latitude && updateDto.longitude) {
                updatedData.location = () => `
          ST_SetSRID(
            ST_MakePoint(${updateDto.longitude}, ${updateDto.latitude}),
            4326
          )
        `;
            }

            // Actualizar fechas específicas
            if (updateDto.eventDate) {
                if (report.type === ReportType.LOST) {
                    updatedData.lostAt = updateDto.eventDate;
                } else {
                    updatedData.foundAt = updateDto.eventDate;
                }
            }

            // Actualizar WhatsApp
            if (updateDto.whatsapp) {
                const whatsappClean = updateDto.whatsapp.replace(/\D/g, '');
                if (whatsappClean.length < 10 || whatsappClean.length > 15) {
                    throw new BadRequestException('Número de WhatsApp inválido');
                }
                updatedData.whatsapp = whatsappClean;
            }

            // Actualizar reporte
            Object.assign(report, updatedData);
            report.updatedAt = new Date();
            report.lastActivityAt = new Date();

            await queryRunner.manager.save(report);

            // Actualizar fotos si se proporcionan
            if (files && files.length > 0) {
                const maxPhotos = this.configService.get<number>('photos.maxPhotos', 3);

                // Verificar que no exceda el máximo
                const existingPhotos = await queryRunner.manager.find(ReportPhoto, {
                    where: { reportId: id },
                });

                if (existingPhotos.length + files.length > maxPhotos) {
                    throw new BadRequestException(`Máximo ${maxPhotos} fotos permitidas`);
                }

                // Eliminar fotos existentes
                await this.photosService.deletePhotos(
                    existingPhotos.map(p => p.cloudinaryPublicId),
                );
                await queryRunner.manager.delete(ReportPhoto, { reportId: id });

                // Subir nuevas fotos
                const photoUploads = await this.photosService.uploadPhotos(
                    files,
                    report.id,
                    queryRunner.manager,
                );

                const photos = photoUploads.map((upload, index) =>
                    queryRunner.manager.create(ReportPhoto, {
                        reportId: report.id,
                        cloudinaryUrl: upload.url,
                        cloudinaryPublicId: upload.publicId,
                        orderIndex: index,
                    }),
                );

                await queryRunner.manager.save(photos);
            }

            await queryRunner.commitTransaction();

            // Obtener reporte actualizado
            const updatedReport = await this.findById(id);

            this.logger.log(`Reporte ${id} actualizado exitosamente`);

            return updatedReport;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            this.logger.error(`Error actualizando reporte: ${errorMessage}`);
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Marcar reporte como resuelto
     */
    async resolve(id: string, userId: string): Promise<Report> {
        this.logger.log(`Resolviendo reporte ${id}`);

        const report = await this.findById(id);

        // Verificar propiedad
        if (report.userId !== userId) {
            throw new ForbiddenException('Solo puedes resolver tus propios reportes');
        }

        if (report.status === ReportStatus.RESOLVED) {
            throw new BadRequestException('El reporte ya está resuelto');
        }

        report.status = ReportStatus.RESOLVED;
        report.resolvedAt = new Date();
        report.updatedAt = new Date();

        const resolvedReport = await this.reportRepository.save(report);

        this.logger.log(`Reporte ${id} resuelto exitosamente`);

        return resolvedReport;
    }

    /**
     * Obtener reportes de un usuario
     */
    async findByUser(userId: string): Promise<Report[]> {
        // CORREGIDO: Usar relaciones con objeto
        return await this.reportRepository.find({
            where: { 
                userId, 
                status: Not(ReportStatus.DELETED) 
            },
            relations: {
                photos: true,
            },
            order: {
                photos: {
                    orderIndex: 'ASC' as 'ASC',
                },
            },
        });
    }

    /**
     * Reportar contenido inapropiado
     */
    async reportAbuse(
        reportId: string,
        reason: string,
        description?: string,
        ipAddress?: string,
    ): Promise<AbuseReport> {
        const report = await this.findById(reportId);

        if (report.status === ReportStatus.DELETED) {
            throw new BadRequestException('No se puede reportar un reporte eliminado');
        }

        const abuseReport = new AbuseReport({
            reportId: report.id,
            reason: reason as any,
            description: description || null,
            reporterIp: ipAddress || null,
            status: 'PENDING' as any,
        });

        const saved = await this.abuseRepository.save(abuseReport);

        // Incrementar contador de reportes
        report.reportCount += 1;
        await this.reportRepository.save(report);

        // Si supera el umbral, ocultar automáticamente
        const abuseThreshold = this.configService.get<number>('abuse.autoHideThreshold', 3);
        if (report.reportCount >= abuseThreshold) {
            report.status = ReportStatus.HIDDEN;
            await this.reportRepository.save(report);
            this.logger.log(`Reporte ${reportId} ocultado automáticamente por exceder el umbral de abusos`);
        }

        return saved;
    }

    /**
     * Obtener reportes reportados (para admin)
     */
    async getFlaggedReports(): Promise<Report[]> {
        // CORREGIDO: Usar relaciones con objeto
        return await this.reportRepository.find({
            where: {
                status: In([ReportStatus.ACTIVE, ReportStatus.HIDDEN]),
                reportCount: 0,
            },
            relations: {
                photos: true,
                user: true,
                abuseReports: true,
            },
            order: {
                reportCount: 'DESC' as 'DESC',
                createdAt: 'DESC' as 'DESC',
            },
        });
    }

    /**
     * Ocultar reporte (soft delete)
     */
    async hide(id: string, adminId: string): Promise<Report> {
        const report = await this.findById(id);
        report.status = ReportStatus.HIDDEN;
        report.updatedAt = new Date();
        return await this.reportRepository.save(report);
    }

    /**
     * Eliminar reporte definitivamente
     */
    async delete(id: string, adminId: string): Promise<void> {
        const report = await this.findById(id);
        report.status = ReportStatus.DELETED;
        report.updatedAt = new Date();
        await this.reportRepository.save(report);

        // Eliminar fotos de Cloudinary
        if (report.photos && report.photos.length > 0) {
            await this.photosService.deletePhotos(
                report.photos.map(p => p.cloudinaryPublicId),
            );
        }

        this.logger.log(`Reporte ${id} eliminado por admin ${adminId}`);
    }

    /**
     * Obtener estadísticas (para admin)
     */
    async getStats(): Promise<any> {
        const stats = await this.reportRepository
            .createQueryBuilder('report')
            .select([
                'COUNT(*) as total',
                `COUNT(CASE WHEN type = 'LOST' THEN 1 END) as lost`,
                `COUNT(CASE WHEN type = 'FOUND' THEN 1 END) as found`,
                `COUNT(CASE WHEN status = 'RESOLVED' AND type = 'LOST' THEN 1 END) as reunited`,
                `COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active`,
                `COUNT(CASE WHEN status = 'HIDDEN' THEN 1 END) as hidden`,
                `COUNT(CASE WHEN status = 'DELETED' THEN 1 END) as deleted`,
            ])
            .getRawOne();

        // Calcular tiempo promedio de reencuentro
        const avgTime = await this.reportRepository
            .createQueryBuilder('report')
            .select([
                `AVG(EXTRACT(EPOCH FROM (resolved_at - lost_at))) / 3600 as avg_hours`,
            ])
            .where('type = :type', { type: ReportType.LOST })
            .andWhere('status = :status', { status: ReportStatus.RESOLVED })
            .andWhere('resolved_at IS NOT NULL')
            .andWhere('lost_at IS NOT NULL')
            .getRawOne();

        // Actividad últimas 24h
        const activity24h = await this.reportRepository
            .createQueryBuilder('report')
            .where('created_at > NOW() - INTERVAL \'24 hours\'')
            .andWhere('status != :deleted', { deleted: ReportStatus.DELETED })
            .getCount();

        return {
            totalReports: parseInt(stats.total),
            lostReports: parseInt(stats.lost),
            foundReports: parseInt(stats.found),
            reunitedReports: parseInt(stats.reunited),
            activeReports: parseInt(stats.active),
            hiddenReports: parseInt(stats.hidden),
            deletedReports: parseInt(stats.deleted),
            avgReunionHours: avgTime.avg_hours ? Math.round(avgTime.avg_hours) : 0,
            last24hActivity: activity24h,
        };
    }
}