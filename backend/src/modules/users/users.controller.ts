import {Controller, Get, Put, Delete, Body, Param, Query, UseGuards, HttpStatus, HttpCode, ForbiddenException, Post, NotFoundException,} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from './entities/user.entity';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/user.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Obtener todos los usuarios (solo admin)' })
    @ApiResponse({ status: 200, description: 'Lista de usuarios' })
    @ApiResponse({ status: 403, description: 'Prohibido' })
    async findAll(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('role') role?: UserRole,
        @Query('isActive') isActive?: string,
        @Query('search') search?: string,
    ) {
        const filters = {
            role,
            isActive: isActive ? isActive === 'true' : undefined,
            search,
        };
        return await this.usersService.findAll(page, limit, filters);
    }

    @Put('me')
    @ApiOperation({ summary: 'Actualizar perfil del usuario autenticado' })
    @ApiResponse({ status: 200, description: 'Perfil actualizado' })
    @ApiResponse({ status: 400, description: 'Datos inválidos' })
    @ApiResponse({ status: 401, description: 'No autorizado' })
    async updateProfile(
        @CurrentUser() currentUser: User,
        @Body() updateData: UpdateUserDto,
    ) {
        // Los usuarios solo pueden actualizar su propio perfil
        if (updateData.role) {
            // Solo los admins pueden cambiar el rol
            if (!currentUser.role || currentUser.role !== UserRole.ADMIN) {
                throw new ForbiddenException('No tienes permisos para cambiar el rol');
            }
        }
        return await this.usersService.update(currentUser.id, updateData);
    }

    @Delete('me')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Desactivar cuenta del usuario autenticado' })
    @ApiResponse({ status: 204, description: 'Cuenta desactivada' })
    @ApiResponse({ status: 401, description: 'No autorizado' })
    async deactivateAccount(@CurrentUser() user: User) {
        await this.usersService.deactivate(user.id);
    }

    @Get(':id')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Obtener un usuario por ID (solo admin)' })
    @ApiResponse({ status: 200, description: 'Usuario encontrado' })
    @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
    async findById(@Param('id') id: string) {
        const user = await this.usersService.findById(id);
        if (!user) {
            throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
        }
        return user;
    }

    @Put(':id')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Actualizar un usuario (solo admin)' })
    @ApiResponse({ status: 200, description: 'Usuario actualizado' })
    @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
    async updateUser(
        @Param('id') id: string,
        @Body() updateData: UpdateUserDto,
    ) {
        const user = await this.usersService.findById(id);
        if (!user) {
            throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
        }
        return await this.usersService.update(id, updateData);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Desactivar un usuario (solo admin)' })
    @ApiResponse({ status: 204, description: 'Usuario desactivado' })
    @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
    async deactivateUser(@Param('id') id: string) {
        const user = await this.usersService.findById(id);
        if (!user) {
            throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
        }
        await this.usersService.deactivate(id);
    }

    @Post(':id/reactivate')
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reactivar un usuario (solo admin)' })
    @ApiResponse({ status: 200, description: 'Usuario reactivado' })
    @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
    async reactivateUser(@Param('id') id: string) {
        const user = await this.usersService.findById(id);
        if (!user) {
            throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
        }
        return await this.usersService.reactivate(id);
    }
}