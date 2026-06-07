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
  @ApiPropertyOptional({ description: 'Doctor UUID' })
  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @ApiPropertyOptional({ example: '2024-03-15' })
  @IsOptional()
  @IsDateString()
  consultationDate?: string;

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

  @ApiPropertyOptional({
    example: false,
    description: 'Trasplante de dos días (la segunda cirugía es el día siguiente)',
  })
  @IsOptional()
  @IsBoolean()
  trasplanteDosDias?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comentarios?: string;

  @ApiPropertyOptional({ description: 'Array of donor zone UUIDs' })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  donorZoneIds?: string[];

  @ApiPropertyOptional({ description: 'Array of variant UUIDs' })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  variantIds?: string[];
}
