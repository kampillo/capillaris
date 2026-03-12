import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMedicalConsultationDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Doctor UUID' })
  @IsUUID()
  @IsNotEmpty()
  doctorId: string;

  @ApiProperty({ example: '2024-03-15' })
  @IsDateString()
  @IsNotEmpty()
  consultationDate: string;

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
