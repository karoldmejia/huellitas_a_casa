import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { TokenPayloadDto } from '../dto/auth.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
    ) {
        const secret = configService.get<string>('jwt.secret');

        // Validar que el secret existe
        if (!secret) {
            throw new Error(
                'JWT secret is not defined. Please set JWT_SECRET in your environment variables.'
            );
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret,
        });
    }

    async validate(payload: TokenPayloadDto) {
        try {
            // Verificar que el usuario existe y está activo
            const user = await this.usersService.findById(payload.sub);

            if (!user || !user.isActive) {
                throw new UnauthorizedException('Usuario no encontrado o inactivo');
            }

            return {
                id: user.id,
                email: user.email,
                role: user.role,
                displayName: user.displayName,
                photoUrl: user.photoUrl,
            };
        } catch (error) {
            throw new UnauthorizedException('Token inválido');
        }
    }
}