import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleOAuthDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    googleId: string;

    @ApiProperty()
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    displayName?: string;

    @ApiProperty({ required: false })
    @IsUrl()
    @IsOptional()
    photoUrl?: string;
}

export class RefreshTokenDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    refreshToken: string;
}

export class LogoutDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    refreshToken: string;
}

export class TokenPayloadDto {
    @ApiProperty()
    sub: string;

    @ApiProperty()
    email: string;

    @ApiProperty()
    role: string;

    @ApiProperty()
    iat?: number;

    @ApiProperty()
    exp?: number;
}

export class UserResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    email: string;

    @ApiProperty({ required: false })
    displayName?: string;

    @ApiProperty({ required: false })
    photoUrl?: string;

    @ApiProperty()
    role: string;

    @ApiProperty()
    isActive: boolean;

    @ApiProperty({ required: false })
    lastLogin?: Date;

    @ApiProperty()
    createdAt: Date;
}

export class LoginResponseDto {
    @ApiProperty()
    accessToken: string;

    @ApiProperty()
    refreshToken?: string;

    @ApiProperty({ type: () => UserResponseDto }) // <-- Usar función arrow para evitar referencia circular
    user: UserResponseDto;
}