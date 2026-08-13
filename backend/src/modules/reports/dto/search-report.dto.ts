import { IsOptional, IsEnum, IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReportType, Species, Size } from '../enums/report.enums';

export class SearchReportDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiProperty({ enum: ReportType, required: false })
    @IsOptional()
    @IsEnum(ReportType)
    type?: ReportType;

    @ApiProperty({ enum: Species, required: false })
    @IsOptional()
    @IsEnum(Species)
    species?: Species;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    color?: string;

    @ApiProperty({ enum: Size, required: false })
    @IsOptional()
    @IsEnum(Size)
    size?: Size;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    @Min(0)
    latitude?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    @Min(0)
    longitude?: number;

    @ApiProperty({ required: false, default: 5 })
    @IsOptional()
    @IsNumber()
    @Min(0.5)
    @Max(50)
    radius?: number; // En kilómetros

    @ApiProperty({ required: false, default: 1 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    page?: number;

    @ApiProperty({ required: false, default: 20 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(50)
    limit?: number;

    @ApiProperty({ required: false, default: 'relevance' })
    @IsOptional()
    @IsString()
    sortBy?: 'relevance' | 'date' | 'distance';
}