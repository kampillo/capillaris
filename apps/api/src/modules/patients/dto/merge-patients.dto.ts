import { IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UpdatePatientDto } from './update-patient.dto';

export class MergePatientsDto {
  @ApiProperty({
    description:
      'Expediente que se absorbe. Sus registros pasan al que se conserva y queda soft-borrado apuntando a él.',
  })
  @IsUUID()
  absorbedId!: string;

  @ApiPropertyOptional({
    description:
      'Campos ya resueltos por quien revisó, para aplicar al expediente que se conserva. Sólo se tocan los que vengan explícitos.',
    type: UpdatePatientDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePatientDto)
  campos?: UpdatePatientDto;
}
