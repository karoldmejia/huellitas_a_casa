import { Controller, Get, Post, Body, Req, Res, UseGuards, HttpStatus, HttpCode, UnauthorizedException } from '@nestjs/common';
import type { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { LoginResponseDto, RefreshTokenDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly configService: ConfigService,
    ) { }

    @Public()
    @Get('google')
    @UseGuards(GoogleOAuthGuard)
    @ApiOperation({ summary: 'Iniciar sesión con Google' })
    @ApiResponse({ status: 302, description: 'Redirección a Google OAuth' })
    async googleAuth() {
    }

    @Public()
    @Get('google/callback')
    @UseGuards(GoogleOAuthGuard)
    @ApiOperation({ summary: 'Callback de Google OAuth' })
    @ApiResponse({ status: 302, description: 'Redirección con tokens' })
    async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
        try {
            const user = req.user as User;

            if (!user) {
                throw new UnauthorizedException('Usuario no autenticado');
            }

            const loginResponse = await this.authService.login(user);
            const frontendUrl = this.configService.get<string>('frontend.url');

            const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${loginResponse.accessToken}&refreshToken=${loginResponse.refreshToken}`;

            return res.redirect(redirectUrl);
        } catch (error) {
            const frontendUrl = this.configService.get<string>('frontend.url');
            const errorMessage = error instanceof Error
                ? error.message
                : 'Error desconocido en la autenticación';

            return res.redirect(`${frontendUrl}/auth/error?message=${encodeURIComponent(errorMessage)}`);
        }
    }

    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh access token' })
    @ApiResponse({ status: 200, description: 'Token refrescado exitosamente' })
    @ApiResponse({ status: 401, description: 'Token inválido' })
    async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
        try {
            const { refreshToken } = refreshTokenDto;
            return await this.authService.refreshToken(refreshToken);
        } catch (error) {
            // Asegurar que se lance UnauthorizedException
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Cerrar sesión' })
    @ApiResponse({ status: 200, description: 'Sesión cerrada exitosamente' })
    @ApiResponse({ status: 401, description: 'No autorizado' })
    async logout(@CurrentUser() user: User) {
        return { message: 'Sesión cerrada exitosamente' };
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
    @ApiResponse({ status: 200, description: 'Perfil del usuario' })
    @ApiResponse({ status: 401, description: 'No autorizado' })
    async getProfile(@CurrentUser() user: User) {
        return {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            photoUrl: user.photoUrl,
            role: user.role,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
        };
    }

    @Public()
    @Get('validate')
    @ApiOperation({ summary: 'Validar un token JWT' })
    @ApiResponse({ status: 200, description: 'Token válido' })
    @ApiResponse({ status: 401, description: 'Token inválido' })
    async validateToken(@Req() req: Request) {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            throw new UnauthorizedException('Token no proporcionado');
        }
        const isValid = await this.authService.validateToken(token);
        if (!isValid) {
            throw new UnauthorizedException('Token inválido');
        }
        return { isValid: true };
    }
}