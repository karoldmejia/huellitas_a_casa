// src/modules/reports/reports.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { ReportsService } from '../../../src/modules/reports/reports.service';
import { Report } from '../../../src/modules/reports/entities/report.entity';
import { ReportPhoto } from '../../../src/modules/photos/entities/report-photo.entity';
import { AbuseReport } from '../../../src/modules/reports/entities/abuse-report.entity';
import { PhotosService } from '../../../src/modules/photos/photos.service';
import { ReportType, Species, Size, ReportStatus, Gender } from '../../../src/modules/reports/enums/report.enums';

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

describe('ReportsService', () => {
    let service: ReportsService;
    let reportRepository: Repository<Report>;
    let dataSource: DataSource;
    let mockQueryRunner: any;
    let mockAbuseRepository: any;

    // Crear un mock completo de Report
    const createMockReport = (overrides: Partial<Report> = {}): Report => {
        const baseReport: Report = {
            id: '123',
            userId: 'user-123',
            user: null as any,
            type: ReportType.LOST,
            status: ReportStatus.ACTIVE,
            petName: 'Firulais',
            species: Species.DOG,
            breed: 'Labrador',
            gender: Gender.MALE,
            color: 'Brown',
            size: Size.MEDIUM,
            description: 'Un perro muy amigable',
            location: { coordinates: [-58.3816, -34.6037] } as any,
            addressText: 'Plaza de Mayo',
            lostAt: new Date(),
            foundAt: null as any,
            resolvedAt: null as any,
            whatsapp: '1234567890',
            termsAccepted: true,
            viewsCount: 0,
            reportCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastActivityAt: new Date(),
            photos: [],
            abuseReports: [],
        };
        return { ...baseReport, ...overrides } as Report;
    };

    const mockReport = createMockReport();

    // Mock de QueryRunner - USANDO "as any"
    const createMockQueryRunner = () => {
        const manager = {
            createQueryBuilder: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getExists: jest.fn().mockResolvedValue(true),
            }),
            save: jest.fn().mockResolvedValue(mockReport),
            create: jest.fn().mockReturnValue(mockReport),
            find: jest.fn().mockResolvedValue([]),
            delete: jest.fn().mockResolvedValue(undefined),
            findOne: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
            remove: jest.fn().mockResolvedValue(undefined),
            count: jest.fn().mockResolvedValue(0),
            query: jest.fn().mockResolvedValue([]),
        } as any; // <-- SOLUCIÓN: usar "as any"

        return {
            connect: jest.fn().mockResolvedValue(undefined),
            startTransaction: jest.fn().mockResolvedValue(undefined),
            commitTransaction: jest.fn().mockResolvedValue(undefined),
            rollbackTransaction: jest.fn().mockResolvedValue(undefined),
            release: jest.fn().mockResolvedValue(undefined),
            manager,
        };
    };

    mockQueryRunner = createMockQueryRunner();

    const mockDataSource = {
        createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    // Mock de AbuseRepository
    mockAbuseRepository = {
        save: jest.fn().mockResolvedValue({
            id: 'abuse-123',
            reportId: '123',
            reason: 'SPAM',
            status: 'PENDING',
            createdAt: new Date(),
        }),
    };

    // Crear el mock de createQueryBuilder para getStats
    const createMockQueryBuilderWithSelect = () => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockReport], 1]),
        getRawOne: jest.fn().mockResolvedValue({
            total: '10',
            lost: '5',
            found: '3',
            reunited: '2',
            active: '8',
            hidden: '1',
            deleted: '1',
        }),
        getCount: jest.fn().mockResolvedValue(5),
        getRawMany: jest.fn().mockResolvedValue([]),
        addSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        having: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
    });

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReportsService,
                {
                    provide: getRepositoryToken(Report),
                    useValue: {
                        create: jest.fn().mockReturnValue(mockReport),
                        save: jest.fn().mockImplementation((report) => {
                            return Promise.resolve({ ...report });
                        }),
                        findOne: jest.fn().mockResolvedValue(mockReport),
                        find: jest.fn().mockResolvedValue([mockReport]),
                        createQueryBuilder: jest.fn().mockImplementation(() => {
                            return createMockQueryBuilderWithSelect();
                        }),
                    },
                },
                {
                    provide: getRepositoryToken(ReportPhoto),
                    useValue: {
                        create: jest.fn(),
                        save: jest.fn(),
                        delete: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(AbuseReport),
                    useValue: mockAbuseRepository,
                },
                {
                    provide: PhotosService,
                    useValue: {
                        uploadPhotos: jest.fn().mockResolvedValue([
                            { url: 'https://example.com/photo.jpg', publicId: 'photo-123' },
                        ]),
                        deletePhotos: jest.fn().mockResolvedValue(undefined),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockReturnValue(3),
                    },
                },
                {
                    provide: DataSource,
                    useValue: mockDataSource,
                },
            ],
        }).compile();

        service = module.get<ReportsService>(ReportsService);
        reportRepository = module.get<Repository<Report>>(getRepositoryToken(Report));
        dataSource = module.get<DataSource>(DataSource);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create a report successfully', async () => {
            const createDto = {
                type: ReportType.LOST,
                species: Species.DOG,
                color: 'Brown',
                size: Size.MEDIUM,
                latitude: -34.6037,
                longitude: -58.3816,
                whatsapp: '+541112345678',
                termsAccepted: true,
                eventDate: new Date(),
            };

            const files: MulterFile[] = [
                {
                    buffer: Buffer.from('test'),
                    fieldname: 'photos',
                    originalname: 'test.jpg',
                    encoding: '7bit',
                    mimetype: 'image/jpeg',
                    size: 1024,
                    destination: '/tmp',
                    filename: 'test.jpg',
                    path: '/tmp/test.jpg',
                }
            ];

            const result = await service.create(createDto, files, 'user-123');

            expect(result).toBeDefined();
            expect(result.type).toBe(ReportType.LOST);
            expect(dataSource.createQueryRunner).toHaveBeenCalled();
            expect(mockQueryRunner.connect).toHaveBeenCalled();
            expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
        });

        it('should throw error if no files provided', async () => {
            const createDto = {
                type: ReportType.LOST,
                species: Species.DOG,
                color: 'Brown',
                size: Size.MEDIUM,
                latitude: -34.6037,
                longitude: -58.3816,
                whatsapp: '+541112345678',
                termsAccepted: true,
                eventDate: new Date(),
            };

            await expect(service.create(createDto, [], 'user-123')).rejects.toThrow(
                'Se requiere al menos una foto',
            );
        });

        it('should throw error if WhatsApp number is invalid', async () => {
            const createDto = {
                type: ReportType.LOST,
                species: Species.DOG,
                color: 'Brown',
                size: Size.MEDIUM,
                latitude: -34.6037,
                longitude: -58.3816,
                whatsapp: '123',
                termsAccepted: true,
                eventDate: new Date(),
            };

            const files: MulterFile[] = [
                {
                    buffer: Buffer.from('test'),
                    fieldname: 'photos',
                    originalname: 'test.jpg',
                    encoding: '7bit',
                    mimetype: 'image/jpeg',
                    size: 1024,
                    destination: '/tmp',
                    filename: 'test.jpg',
                    path: '/tmp/test.jpg',
                }
            ];

            await expect(service.create(createDto, files, 'user-123')).rejects.toThrow(
                'Número de WhatsApp inválido',
            );
        });

        it('should throw error if terms not accepted', async () => {
            const createDto = {
                type: ReportType.LOST,
                species: Species.DOG,
                color: 'Brown',
                size: Size.MEDIUM,
                latitude: -34.6037,
                longitude: -58.3816,
                whatsapp: '+541112345678',
                termsAccepted: false,
                eventDate: new Date(),
            };

            const files: MulterFile[] = [
                {
                    buffer: Buffer.from('test'),
                    fieldname: 'photos',
                    originalname: 'test.jpg',
                    encoding: '7bit',
                    mimetype: 'image/jpeg',
                    size: 1024,
                    destination: '/tmp',
                    filename: 'test.jpg',
                    path: '/tmp/test.jpg',
                }
            ];

            await expect(service.create(createDto, files, 'user-123')).rejects.toThrow(
                'Debes aceptar los términos de contacto',
            );
        });
    });

    describe('findById', () => {
        it('should return a report by id', async () => {
            const result = await service.findById('123');
            expect(result).toBeDefined();
            expect(result.id).toBe('123');
        });

        it('should throw NotFoundException if report not found', async () => {
            jest.spyOn(reportRepository, 'findOne').mockResolvedValueOnce(null);
            await expect(service.findById('non-existent')).rejects.toThrow(
                'Reporte no encontrado',
            );
        });
    });

    describe('resolve', () => {
        it('should resolve a report', async () => {
            const report = createMockReport({ userId: 'user-123' });
            const resolvedReport = createMockReport({ 
                userId: 'user-123',
                status: ReportStatus.RESOLVED,
                resolvedAt: new Date()
            });
            
            jest.spyOn(reportRepository, 'findOne').mockResolvedValueOnce(report);
            jest.spyOn(reportRepository, 'save').mockResolvedValueOnce(resolvedReport);

            const result = await service.resolve('123', 'user-123');
            expect(result.status).toBe(ReportStatus.RESOLVED);
        });

        it('should throw ForbiddenException if user is not owner', async () => {
            const report = createMockReport({ userId: 'user-456' });
            jest.spyOn(reportRepository, 'findOne').mockResolvedValueOnce(report);

            await expect(service.resolve('123', 'user-123')).rejects.toThrow(
                'Solo puedes resolver tus propios reportes',
            );
        });

        it('should throw BadRequestException if already resolved', async () => {
            const report = createMockReport({ 
                userId: 'user-123',
                status: ReportStatus.RESOLVED 
            });
            jest.spyOn(reportRepository, 'findOne').mockResolvedValueOnce(report);

            await expect(service.resolve('123', 'user-123')).rejects.toThrow(
                'El reporte ya está resuelto',
            );
        });
    });

    describe('findByUser', () => {
        it('should return reports for a user', async () => {
            const result = await service.findByUser('user-123');
            expect(result).toBeInstanceOf(Array);
            expect(result[0]).toBeDefined();
        });
    });

    describe('getStats', () => {
        it('should return statistics', async () => {
            const result = await service.getStats();
            expect(result).toHaveProperty('totalReports');
            expect(result).toHaveProperty('lostReports');
            expect(result).toHaveProperty('foundReports');
            expect(result).toHaveProperty('reunitedReports');
            expect(result).toHaveProperty('last24hActivity');
            expect(result.totalReports).toBe(10);
            expect(result.lostReports).toBe(5);
        });
    });

    describe('reportAbuse', () => {
        it('should create an abuse report', async () => {
            const result = await service.reportAbuse('123', 'SPAM', 'Contenido inapropiado', '127.0.0.1');
            expect(result).toBeDefined();
            expect(result.reportId).toBe('123');
            expect(mockAbuseRepository.save).toHaveBeenCalled();
        });

        it('should throw error if report is deleted', async () => {
            const deletedReport = createMockReport({ 
                status: ReportStatus.DELETED 
            });
            jest.spyOn(reportRepository, 'findOne').mockResolvedValueOnce(deletedReport);

            await expect(service.reportAbuse('123', 'SPAM')).rejects.toThrow(
                'No se puede reportar un reporte eliminado',
            );
        });

        it('should auto-hide report after abuse threshold', async () => {
            const report = createMockReport({ reportCount: 2 });
            jest.spyOn(reportRepository, 'findOne').mockResolvedValueOnce(report);
            jest.spyOn(reportRepository, 'save').mockResolvedValue({
                ...report,
                reportCount: 3,
                status: ReportStatus.HIDDEN,
            });

            await service.reportAbuse('123', 'SPAM');
            expect(report.status).toBe(ReportStatus.HIDDEN);
        });
    });
});