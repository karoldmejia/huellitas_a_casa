import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from 'typeorm';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

// Definir el tipo de archivo
interface MulterFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
    destination?: string;
    filename?: string;
    path?: string;
}

@Injectable()
export class PhotosService {
    private readonly logger = new Logger(PhotosService.name);

    constructor(private configService: ConfigService) {
        cloudinary.config({
            cloud_name: this.configService.get('cloudinary.cloudName'),
            api_key: this.configService.get('cloudinary.apiKey'),
            api_secret: this.configService.get('cloudinary.apiSecret'),
        });
    }

    /**
     * Subir fotos a Cloudinary
     */
    async uploadPhotos(
        files: MulterFile[],
        reportId: string,
        entityManager?: EntityManager,
    ): Promise<{ url: string; publicId: string }[]> {
        this.logger.log(`Subiendo ${files.length} fotos para reporte ${reportId}`);

        if (!files || files.length === 0) {
            throw new BadRequestException('No se proporcionaron archivos para subir');
        }

        const invalidFiles = files.filter(file => !file.buffer || file.buffer.length === 0);
        if (invalidFiles.length > 0) {
            throw new BadRequestException('Algunos archivos están vacíos o corruptos');
        }

        const uploadPromises = files.map((file) => {
            return new Promise<UploadApiResponse>((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: `huellitas/reports/${reportId}`,
                        transformation: [
                            { width: 800, crop: 'limit', quality: 'auto:good' },
                            { fetch_format: 'auto' },
                        ],
                        allowed_formats: ['jpg', 'png', 'webp', 'heic'],
                    },
                    (error, result) => {
                        if (error) {
                            reject(error);
                        } else if (!result) {
                            reject(new Error('Cloudinary no devolvió un resultado válido'));
                        } else {
                            resolve(result);
                        }
                    },
                );

                uploadStream.end(file.buffer);
            });
        });

        try {
            const results = await Promise.all(uploadPromises);
            
            // Filtrar resultados undefined (por seguridad)
            const validResults = results.filter((result): result is UploadApiResponse => result !== undefined && result !== null);
            
            if (validResults.length === 0) {
                throw new BadRequestException('No se pudo subir ninguna foto');
            }

            return validResults.map((result) => ({
                url: result.secure_url,
                publicId: result.public_id,
            }));
        } catch (error) {
            // Manejo seguro del error
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido al subir fotos';
            this.logger.error(`Error subiendo fotos: ${errorMessage}`);
            throw new BadRequestException(`Error al subir las fotos: ${errorMessage}`);
        }
    }

    /**
     * Eliminar fotos de Cloudinary
     */
    async deletePhotos(publicIds: string[]): Promise<void> {
        if (!publicIds || publicIds.length === 0) {
            this.logger.log('No se proporcionaron publicIds para eliminar');
            return;
        }

        this.logger.log(`Eliminando ${publicIds.length} fotos de Cloudinary`);

        try {
            const results = await Promise.all(
                publicIds.map((publicId) => cloudinary.uploader.destroy(publicId)),
            );

            // Verificar resultados
            const failed = results.filter(r => r.result !== 'ok');
            if (failed.length > 0) {
                this.logger.warn(`${failed.length} fotos no pudieron ser eliminadas`);
                // Registrar los publicIds que fallaron si es necesario
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido al eliminar fotos';
            this.logger.error(`Error eliminando fotos: ${errorMessage}`);
            // No lanzar error para no interrumpir el flujo principal
            // Pero podrías lanzarlo si es crítico
            // throw new BadRequestException(`Error al eliminar fotos: ${errorMessage}`);
        }
    }

    /**
     * Obtener URL de una foto con transformaciones
     */
    getOptimizedUrl(publicId: string, options?: { width?: number; height?: number }): string {
        if (!publicId) {
            this.logger.warn('Se intentó obtener URL de un publicId vacío');
            return '';
        }

        try {
            return cloudinary.url(publicId, {
                width: options?.width || 400,
                height: options?.height || 400,
                crop: 'limit',
                quality: 'auto:good',
                fetch_format: 'auto',
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            this.logger.error(`Error generando URL optimizada para ${publicId}: ${errorMessage}`);
            return cloudinary.url(publicId); // URL sin transformaciones
        }
    }

    /**
     * Subir una foto individual
     */
    async uploadSinglePhoto(
        file: MulterFile,
        reportId: string,
    ): Promise<{ url: string; publicId: string }> {
        if (!file || !file.buffer) {
            throw new BadRequestException('Archivo inválido o vacío');
        }

        const results = await this.uploadPhotos([file], reportId);
        if (results.length === 0) {
            throw new BadRequestException('No se pudo subir la foto');
        }
        return results[0];
    }
}