import {
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';
// All fields optional for update
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProcedureDto {
  @ApiPropertyOptional({ example: '2024-03-15' })
  @IsOptional()
  @IsDateString()
  procedureDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ example: 0.8 })
  @IsOptional()
  @IsNumber()
  punchSize?: number;

  @ApiPropertyOptional({ example: 'Choi' })
  @IsOptional()
  @IsString()
  implantador?: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsInt()
  @Min(0)
  cb1?: number;

  @ApiPropertyOptional({ example: 800 })
  @IsOptional()
  @IsInt()
  @Min(0)
  cb2?: number;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @IsInt()
  @Min(0)
  cb3?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  cb4?: number;

  @ApiPropertyOptional({ example: 1550 })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalFoliculos?: number;

  @ApiPropertyOptional({ description: 'Operating room UUID' })
  @IsOptional()
  @IsUUID()
  operatingRoomId?: string;

  // Anesthesia - Extraction
  @ApiPropertyOptional() @IsOptional() @IsDateString()
  anestExtFechaInicial?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  anestExtFechaFinal?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  anestExtLidocaina?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber()
  anestExtAdrenalina?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber()
  anestExtBicarbonatoDeSodio?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber()
  anestExtSolucionFisiologica?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  anestExtAnestesiaInfiltrada?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  anestExtBetametasona?: string;

  // Anesthesia - Implantation
  @ApiPropertyOptional() @IsOptional() @IsDateString()
  anestImpFechaInicial?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  anestImpFechaFinal?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  anestImpLidocaina?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber()
  anestImpAdrenalina?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber()
  anestImpBicarbonatoDeSodio?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber()
  anestImpSolucionFisiologica?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  anestImpAnestesiaInfiltrada?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  anestImpBetametasona?: string;

  @ApiPropertyOptional({ description: 'Array of doctor UUIDs' })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  doctorIds?: string[];

  @ApiPropertyOptional({ description: 'Array of hair type UUIDs' })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  hairTypeIds?: string[];

  @ApiPropertyOptional({ example: '08:30', description: 'Hora de inicio (HH:MM)' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'horaInicio debe ser HH:MM' })
  horaInicio?: string;

  @ApiPropertyOptional({ example: '13:00', description: 'Inicio de la comida (HH:MM)' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'horaComidaInicio debe ser HH:MM' })
  horaComidaInicio?: string;

  @ApiPropertyOptional({ example: '14:00', description: 'Fin de la comida (HH:MM)' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'horaComidaFin debe ser HH:MM' })
  horaComidaFin?: string;

  @ApiPropertyOptional({ example: '14:30', description: 'Inicio de la implantación (HH:MM)' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'horaImplantacionInicio debe ser HH:MM' })
  horaImplantacionInicio?: string;

  @ApiPropertyOptional({ example: '18:45', description: 'Hora de fin (HH:MM)' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'horaFin debe ser HH:MM' })
  horaFin?: string;

  @ApiPropertyOptional({ description: 'Agrupa los reportes de una sesión de varios días' })
  @IsOptional()
  @IsUUID()
  sessionGroupId?: string;

  @ApiPropertyOptional({ example: 1, description: 'Día dentro de la sesión (1, 2, ...)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  sessionDay?: number;
}
