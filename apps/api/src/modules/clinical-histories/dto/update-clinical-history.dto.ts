import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  InheritRelativesDto,
  NonPathologicalPersonalDto,
  PreviousTreatmentDto,
  PhysicalExplorationDto,
} from './create-clinical-history.dto';

export class UpdateClinicalHistoryDto {
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
