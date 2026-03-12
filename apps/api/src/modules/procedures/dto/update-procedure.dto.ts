import {
  IsOptional,
  IsString,
  IsDateString,
  IsInt,
  IsNumber,
  IsArray,
  IsUUID,
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
  @IsUUID('4', { each: true })
  doctorIds?: string[];

  @ApiPropertyOptional({ description: 'Array of hair type UUIDs' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  hairTypeIds?: string[];
}
