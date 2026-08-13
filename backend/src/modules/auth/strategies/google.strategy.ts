// src/modules/auth/strategies/google.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { GoogleOAuthDto } from '../dto/auth.dto';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(
        private readonly authService: AuthService,
        private readonly configService: ConfigService,
    ) {
        const clientID = configService.get<string>('google.clientId');
        const clientSecret = configService.get<string>('google.clientSecret');
        const callbackURL = configService.get<string>('google.callbackUrl');

        // Validar que las variables requeridas existen
        if (!clientID || !clientSecret || !callbackURL) {
            throw new Error(
                'Missing Google OAuth configuration. Please check your environment variables.\n' +
                'Required: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL'
            );
        }

        super({
            clientID,
            clientSecret,
            callbackURL,
            scope: ['email', 'profile'],
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: VerifyCallback,
    ): Promise<any> {
        try {
            const { id, emails, displayName, photos } = profile;

            if (!emails || emails.length === 0) {
                throw new UnauthorizedException('No se pudo obtener el email de Google');
            }

            const googleUser: GoogleOAuthDto = {
                googleId: id,
                email: emails[0].value,
                displayName: displayName || emails[0].value.split('@')[0],
                photoUrl: photos && photos.length > 0 ? photos[0].value : undefined,
            };

            const user = await this.authService.validateOAuthUser(googleUser);
            done(null, user);
        } catch (error) {
            done(error, undefined);
        }
    }
}