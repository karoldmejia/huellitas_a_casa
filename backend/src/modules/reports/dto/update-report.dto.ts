import { ApiProperty } from "@nestjs/swagger";
import { IsDate, IsEnum, IsNumber, IsOptional, IsPhoneNumber, IsString, Max, MaxLength, Min } from "class-validator";
import { Gender, Size } from "../enums/report.enums";
import { Transform } from "class-transformer";

export class UpdateReportDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    petName?: string;

    // species NO ES EDITABLE

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    breed?: string;

    @ApiProperty({ enum: Gender, required: false })
    @IsOptional()
    @IsEnum(Gender)
    gender?: Gender;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    color?: string;

    @ApiProperty({ enum: Size, required: false })
    @IsOptional()
    @IsEnum(Size)
    size?: Size;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    @MaxLength(300)
    description?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    @Min(-90)
    @Max(90)
    latitude?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    @Min(-180)
    @Max(180)
    longitude?: number;

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

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    @IsPhoneNumber(undefined)
    whatsapp?: string;
}