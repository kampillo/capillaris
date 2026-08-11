import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTreatmentDto {
  @ApiProperty()
  @IsUUID()
  patientId!: string;

  @ApiProperty({ example: '2026-08-06' })
  @IsDateString()
  fecha!: string;

  @ApiPropertyOptional({
    description: 'Códigos o UUIDs del catálogo de tipos de tratamiento',
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  treatmentTypeIds?: string[];

  @ApiPropertyOptional({ description: 'Zonas tratadas (catálogo hair_types)' })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  zonaIds?: string[];

  @ApiPropertyOptional({ description: 'Quién lo aplicó' })
  @IsOptional()
  @IsUUID()
  realizadoPorId?: string;

  @ApiPropertyOptional({ example: 3, description: 'Número de sesión' })
  @IsOptional()
  @IsInt()
  @Min(1)
  sesionNumero?: number;

  @ApiPropertyOptional({ example: 45, description: 'Duración en minutos' })
  @IsOptional()
  @IsInt()
  @Min(0)
  duracion?: number;

  @ApiPropertyOptional({ example: '18:1' })
  @IsOptional()
  @IsString()
  dilucion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comentarios?: string;
}
