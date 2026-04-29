import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsBoolean,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InheritRelativesDto {
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  negados?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  hta?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  dm?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  ca?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  respiratorios?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  otros?: string;
}

export class NonPathologicalPersonalDto {
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  tabaquismo?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  alcoholismo?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  alergias?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  actFisica?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  otros?: string;
}

export class PreviousTreatmentDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  minoxidil?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  fue?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  finasteride?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  fuss?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  dutasteride?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  bicalutamida?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  negados?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  otros?: string;
}

export class PhysicalExplorationDto {
  @ApiPropertyOptional({ example: 72 })
  @IsOptional()
  @IsNumber()
  fc?: number;

  @ApiPropertyOptional({ example: '120/80' })
  @IsOptional()
  @IsString()
  ta?: string;

  @ApiPropertyOptional({ example: 18 })
  @IsOptional()
  @IsNumber()
  fr?: number;

  @ApiPropertyOptional({ example: 36.5 })
  @IsOptional()
  @IsNumber()
  temperatura?: number;

  @ApiPropertyOptional({ example: 75.5 })
  @IsOptional()
  @IsNumber()
  peso?: number;

  @ApiPropertyOptional({ example: 1.75 })
  @IsOptional()
  @IsNumber()
  talla?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateClinicalHistoryDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  personalesPatologicos?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  padecimientoActual?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  diagnostico?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tratamiento?: string;

  @ApiPropertyOptional({ type: InheritRelativesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => InheritRelativesDto)
  inheritRelatives?: InheritRelativesDto;

  @ApiPropertyOptional({ type: NonPathologicalPersonalDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NonPathologicalPersonalDto)
  nonPathologicalPersonal?: NonPathologicalPersonalDto;

  @ApiPropertyOptional({ type: PreviousTreatmentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PreviousTreatmentDto)
  previousTreatment?: PreviousTreatmentDto;

  @ApiPropertyOptional({ type: PhysicalExplorationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PhysicalExplorationDto)
  physicalExploration?: PhysicalExplorationDto;
}
