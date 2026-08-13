import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        UsersModule,
        PassportModule.register({ session: true }),
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'default-secret-change-me',
            signOptions: {
                expiresIn: '7d',
            },
        }),
        TypeOrmModule.forFeature([User]),
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        GoogleStrategy,
        JwtStrategy,
    ],
    exports: [AuthService],
})
export class AuthModule { }