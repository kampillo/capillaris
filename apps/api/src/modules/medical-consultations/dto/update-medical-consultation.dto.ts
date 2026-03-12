import {
  IsOptional,
  IsString,
  IsDateString,
  IsBoolean,
  IsArray,
  IsUUID,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMedicalConsultationDto {
  @ApiPropertyOptional({ example: 'mediano' })
  @IsOptional()
  @IsString()
  grosor?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  caspa?: boolean;

  @ApiPropertyOptional({ example: 'negro' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  grasa?: boolean;

  @ApiPropertyOptional({ example: 'liso' })
  @IsOptional()
  @IsString()
  textura?: string;

  @ApiPropertyOptional({ example: 'suficiente' })
  @IsOptional()
  @IsString()
  valoracionZonaDonante?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  diagnostico?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  estrategiaQuirurgica?: string;

  @ApiPropertyOptional({ example: '2024-06-15' })
  @IsOptional()
  @IsDateString()
  fechaSugeridaTransplante?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comentarios?: string;

  @ApiPropertyOptional({ description: 'Array of donor zone UUIDs' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  donorZoneIds?: string[];

  @ApiPropertyOptional({ description: 'Array of variant UUIDs' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  variantIds?: string[];
}
