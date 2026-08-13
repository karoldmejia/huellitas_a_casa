import {IsEnum, IsOptional, IsString, IsNotEmpty, IsNumber, IsDate, IsBoolean, MaxLength, Min, Max, IsPhoneNumber, ValidateIf} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Gender, ReportType, Size, Species } from '../enums/report.enums';

export class CreateReportDto {
    @ApiProperty({ enum: ReportType })
    @IsEnum(ReportType)
    @IsNotEmpty()
    type: ReportType;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    petName?: string;

    @ApiProperty({ enum: Species })
    @IsEnum(Species)
    @IsNotEmpty()
    species: Species;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    breed?: string;

    @ApiProperty({ enum: Gender, required: false })
    @IsOptional()
    @IsEnum(Gender)
    gender?: Gender;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    color: string;

    @ApiProperty({ enum: Size })
    @IsEnum(Size)
    @IsNotEmpty()
    size: Size;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    @MaxLength(300)
    description?: string;

    @ApiProperty()
    @IsNumber()
    @Min(-90)
    @Max(90)
    latitude: number;

    @ApiProperty()
    @IsNumber()
    @Min(-180)
    @Max(180)
    longitude: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    addressText?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @Transform(({ value }) => value ? new Date(value) : null)
    @IsDate()
    eventDate?: Date;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @IsPhoneNumber(undefined)
    whatsapp: string;

    @ApiProperty()
    @IsBoolean()
    @IsNotEmpty()
    termsAccepted: boolean;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    userAgent?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    @MaxLength(45)
    ipAddress?: string;
}