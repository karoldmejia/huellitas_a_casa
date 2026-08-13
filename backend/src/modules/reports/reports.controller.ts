import {Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, UseGuards, UseInterceptors,UploadedFiles, Req, Ip, ParseUUIDPipe, BadRequestException} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Request } from 'express';

import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { SearchReportDto } from './dto/search-report.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { Report } from './entities/report.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpdateReportDto } from './dto/update-report.dto';
import { Multer } from 'multer'; 

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Post()
    @ApiOperation({ summary: 'Crear un nuevo reporte' })
    @ApiResponse({ status: 201, description: 'Reporte creado exitosamente' })
    @ApiResponse({ status: 400, description: 'Datos inválidos' })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(
        FileFieldsInterceptor([{ name: 'photos', maxCount: 3 }]),
    )
    async create(
        @Body() createDto: CreateReportDto,
        @UploadedFiles() files: { photos?: Express.Multer.File[] },
        @CurrentUser() user: User | null,
        @Req() req: Request,
        @Ip() ip: string,
    ): Promise<Report> {
        // Validar que se subieron fotos
        if (!files?.photos || files.photos.length === 0) {
            throw new BadRequestException('Se requiere al menos una foto');
        }

        // Agregar metadata de la petición
        createDto.userAgent = req.headers['user-agent'] || undefined;
        createDto.ipAddress = ip;

        return await this.reportsService.create(
            createDto,
            files.photos,
            user?.id,
        );
    }

    @Get('search')
    @Public()
    @ApiOperation({ summary: 'Buscar reportes con filtros' })
    @ApiResponse({ status: 200, description: 'Resultados de búsqueda' })
    async search(@Query() searchDto: SearchReportDto): Promise<{ data: Report[]; total: number }> {
        return await this.reportsService.search(searchDto);
    }

    @Get('user/my-reports')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Obtener reportes del usuario autenticado' })
    @ApiResponse({ status: 200, description: 'Reportes del usuario' })
    async getMyReports(@CurrentUser() user: User): Promise<Report[]> {
        return await this.reportsService.findByUser(user.id);
    }

    @Get('admin/flagged')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Obtener reportes señalados (admin)' })
    @ApiResponse({ status: 200, description: 'Reportes señalados' })
    async getFlagged(): Promise<Report[]> {
        return await this.reportsService.getFlaggedReports();
    }

    @Get('admin/stats')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Obtener estadísticas (admin)' })
    @ApiResponse({ status: 200, description: 'Estadísticas de reportes' })
    async getStats() {
        return await this.reportsService.getStats();
    }

    @Get(':id')
    @Public()
    @ApiOperation({ summary: 'Obtener detalle de un reporte' })
    @ApiResponse({ status: 200, description: 'Detalle del reporte' })
    @ApiResponse({ status: 404, description: 'Reporte no encontrado' })
    async findById(@Param('id', ParseUUIDPipe) id: string): Promise<Report> {
        return await this.reportsService.findById(id);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Actualizar un reporte (solo propietario)' })
    @ApiResponse({ status: 200, description: 'Reporte actualizado' })
    @ApiResponse({ status: 403, description: 'No autorizado' })
    @ApiResponse({ status: 404, description: 'Reporte no encontrado' })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(
        FileFieldsInterceptor([{ name: 'photos', maxCount: 3 }]),
    )
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateDto: UpdateReportDto,
        @UploadedFiles() files: { photos?: Express.Multer.File[] },
        @CurrentUser() user: User,
    ): Promise<Report> {
        return await this.reportsService.update(
            id,
            updateDto,
            user.id,
            files?.photos,
        );
    }

    @Patch(':id/resolve')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Marcar reporte como resuelto (solo propietario)' })
    @ApiResponse({ status: 200, description: 'Reporte resuelto' })
    @ApiResponse({ status: 403, description: 'No autorizado' })
    @ApiResponse({ status: 404, description: 'Reporte no encontrado' })
    async resolve(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: User,
    ): Promise<Report> {
        return await this.reportsService.resolve(id, user.id);
    }

    @Post(':id/report')
    @Public()
    @ApiOperation({ summary: 'Reportar contenido inapropiado' })
    @ApiResponse({ status: 201, description: 'Reporte de abuso creado' })
    @ApiResponse({ status: 404, description: 'Reporte no encontrado' })
    async reportAbuse(
        @Param('id', ParseUUIDPipe) id: string,
        @Body('reason') reason: string,
        @Body('description') description: string,
        @Ip() ip: string,
    ) {
        if (!reason) {
            throw new BadRequestException('Se requiere un motivo');
        }
        return await this.reportsService.reportAbuse(id, reason, description, ip);
    }

    @Patch(':id/hide')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Ocultar un reporte (admin)' })
    @ApiResponse({ status: 200, description: 'Reporte ocultado' })
    @ApiResponse({ status: 404, description: 'Reporte no encontrado' })
    async hide(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: User,
    ): Promise<Report> {
        return await this.reportsService.hide(id, user.id);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Eliminar un reporte (admin)' })
    @ApiResponse({ status: 204, description: 'Reporte eliminado' })
    @ApiResponse({ status: 404, description: 'Reporte no encontrado' })
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: User,
    ): Promise<void> {
        await this.reportsService.delete(id, user.id);
    }
}