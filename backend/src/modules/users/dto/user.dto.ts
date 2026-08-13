import { IsEmail, IsOptional, IsString, IsUrl, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class UpdateUserDto {
    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    displayName?: string;

    @ApiProperty({ required: false })
    @IsUrl()
    @IsOptional()
    photoUrl?: string;

    @ApiProperty({ required: false, enum: UserRole })
    @IsEnum(UserRole)
    @IsOptional()
    role?: UserRole;

    @ApiProperty({ required: false })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

export class UserProfileResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    email: string;

    @ApiProperty({ required: false })
    displayName?: string;

    @ApiProperty({ required: false })
    photoUrl?: string;

    @ApiProperty()
    role: UserRole;

    @ApiProperty()
    isActive: boolean;

    @ApiProperty()
    lastLogin: Date;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}

export class UserStatsDto {
    @ApiProperty()
    totalReports: number;

    @ApiProperty()
    activeReports: number;

    @ApiProperty()
    resolvedReports: number;

    @ApiProperty()
    totalMatches: number;
}