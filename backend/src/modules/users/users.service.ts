import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { GoogleOAuthDto } from '../auth/dto/auth.dto';
import { UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    /**
     * Encuentra un usuario por ID
     */
    async findById(id: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id, isActive: true },
        });

        if (!user) {
            throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
        }

        return user;
    }

    /**
     * Encuentra un usuario por Google ID
     */
    async findByGoogleId(googleId: string): Promise<User | null> {
        return await this.userRepository.findOne({
            where: { googleId, isActive: true },
        });
    }

    /**
     * Encuentra un usuario por email
     */
    async findByEmail(email: string): Promise<User | null> {
        return await this.userRepository.findOne({
            where: { email, isActive: true },
        });
    }

    /**
     * Crea un nuevo usuario
     */
    async create(userData: Partial<User>): Promise<User> {
        this.logger.log(`Creando usuario: ${userData.email}`);

        // Verificar que el email no esté en uso
        const existingUser = await this.userRepository.findOne({
            where: { email: userData.email },
        });

        if (existingUser) {
            throw new ConflictException(`El email ${userData.email} ya está registrado`);
        }

        const user = this.userRepository.create({
            ...userData,
            role: userData.role || UserRole.USER,
            isActive: true,
        });

        const savedUser = await this.userRepository.save(user);
        this.logger.log(`Usuario creado exitosamente: ${savedUser.id}`);

        return savedUser;
    }

    /**
     * Vincula una cuenta de Google a un usuario existente
     */
    async linkGoogleAccount(
        userId: string,
        googleData: { googleId: string; displayName?: string; photoUrl?: string },
    ): Promise<User> {
        const user = await this.findById(userId);

        // Verificar que el googleId no esté vinculado a otro usuario
        const existingGoogleUser = await this.userRepository.findOne({
            where: { googleId: googleData.googleId },
        });

        if (existingGoogleUser && existingGoogleUser.id !== userId) {
            throw new ConflictException('Esta cuenta de Google ya está vinculada a otro usuario');
        }

        user.googleId = googleData.googleId;
        if (googleData.displayName) {
            user.displayName = googleData.displayName;
        }
        if (googleData.photoUrl) {
            user.photoUrl = googleData.photoUrl;
        }

        return await this.userRepository.save(user);
    }

    /**
     * Actualiza un usuario
     */
    async update(userId: string, updateData: UpdateUserDto): Promise<User> {
        const user = await this.findById(userId);

        Object.assign(user, updateData);
        const updatedUser = await this.userRepository.save(user);

        this.logger.log(`Usuario actualizado: ${userId}`);
        return updatedUser;
    }

    /**
     * Actualiza el último login
     */
    async updateLastLogin(userId: string): Promise<void> {
        await this.userRepository.update(userId, {
            lastLogin: new Date(),
        });
    }

    /**
     * Desactiva un usuario (soft delete)
     */
    async deactivate(userId: string): Promise<void> {
        await this.userRepository.update(userId, {
            isActive: false,
        });
        this.logger.log(`Usuario desactivado: ${userId}`);
    }

    /**
     * Reactiva un usuario
     */
    async reactivate(userId: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
        }

        user.isActive = true;
        return await this.userRepository.save(user);
    }

    /**
     * Encuentra todos los usuarios (solo para administradores)
     */
    async findAll(
        page: number = 1,
        limit: number = 10,
        filters?: { role?: UserRole; isActive?: boolean; search?: string },
    ): Promise<{ users: User[]; total: number }> {
        const queryBuilder = this.userRepository.createQueryBuilder('user');

        // Aplicar filtros
        if (filters?.role) {
            queryBuilder.andWhere('user.role = :role', { role: filters.role });
        }

        if (filters?.isActive !== undefined) {
            queryBuilder.andWhere('user.isActive = :isActive', { isActive: filters.isActive });
        }

        if (filters?.search) {
            queryBuilder.andWhere(
                '(user.email ILIKE :search OR user.displayName ILIKE :search)',
                { search: `%${filters.search}%` },
            );
        }

        const [users, total] = await queryBuilder
            .skip((page - 1) * limit)
            .take(limit)
            .orderBy('user.createdAt', 'DESC')
            .getManyAndCount();

        return { users, total };
    }

    /**
     * Verifica si un usuario es administrador
     */
    async isAdmin(userId: string): Promise<boolean> {
        const user = await this.findById(userId);
        return user.role === UserRole.ADMIN;
    }

    /**
     * Obtiene estadísticas de un usuario
     */
    async getUserStats(userId: string): Promise<any> {
        // Aquí se agregarán las estadísticas cuando tengamos el módulo de reports
        return {
            totalReports: 0,
            activeReports: 0,
            resolvedReports: 0,
            totalMatches: 0,
        };
    }
}