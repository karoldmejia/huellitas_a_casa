import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { User, UserRole } from '../users/entities/user.entity';
import { GoogleOAuthDto, LoginResponseDto, UserResponseDto } from './dto/auth.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    /**
     * Valida o crea un usuario a partir de datos de Google OAuth
     */
    async validateOAuthUser(googleUser: GoogleOAuthDto): Promise<User> {
        this.logger.log(`Validando usuario OAuth: ${googleUser.email}`);

        try {
            // Buscar usuario por googleId
            let user = await this.usersService.findByGoogleId(googleUser.googleId);

            if (!user) {
                // Verificar si existe usuario con el mismo email
                const existingUser = await this.usersService.findByEmail(googleUser.email);

                if (existingUser) {
                    // Vincular cuenta Google con usuario existente
                    this.logger.log(`Vinculando cuenta Google con usuario existente: ${existingUser.email}`);
                    user = await this.usersService.linkGoogleAccount(existingUser.id, {
                        googleId: googleUser.googleId,
                        displayName: googleUser.displayName,
                        photoUrl: googleUser.photoUrl,
                    });
                } else {
                    // Crear nuevo usuario
                    this.logger.log(`Creando nuevo usuario: ${googleUser.email}`);
                    user = await this.usersService.create({
                        googleId: googleUser.googleId,
                        email: googleUser.email,
                        displayName: googleUser.displayName,
                        photoUrl: googleUser.photoUrl,
                        role: UserRole.USER,
                    });
                }
            }

            // Actualizar último login
            await this.usersService.updateLastLogin(user.id);

            return user;
        } catch (error) {
            // Manejo seguro del error
            const errorMessage = this.getErrorMessage(error);
            const errorStack = this.getErrorStack(error);
            this.logger.error(`Error en validateOAuthUser: ${errorMessage}`, errorStack);
            throw error;
        }
    }

    /**
     * Genera tokens JWT para el usuario
     */
    async login(user: User): Promise<LoginResponseDto> {
        this.logger.log(`Generando tokens para usuario: ${user.email}`);

        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                expiresIn: this.configService.get('jwt.expiresIn'),
            }),
            this.jwtService.signAsync(
                { ...payload, type: 'refresh' },
                {
                    expiresIn: '30d',
                    secret: this.configService.get('jwt.secret') + '-refresh',
                },
            ),
        ]);

        return {
            accessToken,
            refreshToken,
            user: this.mapToUserResponse(user),
        };
    }

    /**
     * Refresca el access token usando refresh token
     */
    async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
        try {
            const payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: this.configService.get('jwt.secret') + '-refresh',
            });

            if (payload.type !== 'refresh') {
                throw new UnauthorizedException('Invalid refresh token');
            }

            // Verificar que el usuario existe y está activo
            const user = await this.usersService.findById(payload.sub);
            if (!user || !user.isActive) {
                throw new UnauthorizedException('User not found or inactive');
            }

            const newPayload = {
                sub: user.id,
                email: user.email,
                role: user.role,
            };

            const accessToken = await this.jwtService.signAsync(newPayload, {
                expiresIn: this.configService.get('jwt.expiresIn'),
            });

            return { accessToken };
        } catch (error) {
            const errorMessage = this.getErrorMessage(error);
            this.logger.error(`Error refreshing token: ${errorMessage}`);
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    /**
     * Valida un token JWT
     */
    async validateToken(token: string): Promise<boolean> {
        try {
            await this.jwtService.verifyAsync(token);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Obtiene el usuario desde el payload del token
     */
    async getUserFromToken(token: string): Promise<User | null> {
        try {
            const payload = await this.jwtService.verifyAsync(token);
            return await this.usersService.findById(payload.sub);
        } catch (error) {
            return null;
        }
    }

    /**
     * Obtiene estadísticas del usuario
     */
    async getUserStats(userId: string) {
        try {
            const user = await this.usersService.findById(userId);
            if (!user) {
                throw new UnauthorizedException('Usuario no encontrado');
            }

            // Aquí puedes agregar más estadísticas
            return {
                userId: user.id,
                displayName: user.displayName,
                email: user.email,
                memberSince: user.createdAt,
                // totalReports: await this.reportService.countByUser(userId),
                // activeReports: await this.reportService.countActiveByUser(userId),
            };
        } catch (error) {
            const errorMessage = this.getErrorMessage(error);
            this.logger.error(`Error getting user stats: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Mapea una entidad User a UserResponseDto
     */
    private mapToUserResponse(user: User): UserResponseDto {
        return {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            photoUrl: user.photoUrl,
            role: user.role,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
        };
    }

    /**
     * Helper para obtener mensaje de error de forma segura
     */
    private getErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }
        if (typeof error === 'string') {
            return error;
        }
        if (typeof error === 'object' && error !== null && 'message' in error) {
            return String((error as any).message);
        }
        return 'Error desconocido';
    }

    /**
     * Helper para obtener stack trace de forma segura
     */
    private getErrorStack(error: unknown): string | undefined {
        if (error instanceof Error) {
            return error.stack;
        }
        return undefined;
    }
}