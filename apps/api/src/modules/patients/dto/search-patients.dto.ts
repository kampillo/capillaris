import { IsOptional, IsString, IsInt, Min, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export const PATIENT_SORT_FIELDS = [
  'name',
  'tipoPaciente',
  'origenCanal',
  'updatedAt',
  'createdAt',
] as const;
export type PatientSortField = (typeof PATIENT_SORT_FIELDS)[number];

export class SearchPatientsDto {
  @ApiPropertyOptional({ description: 'Search query (name, email, phone)' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ description: 'Filter by patient type' })
  @IsOptional()
  @IsString()
  tipoPaciente?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @ApiPropertyOptional({ enum: PATIENT_SORT_FIELDS })
  @IsOptional()
  @IsIn(PATIENT_SORT_FIELDS as unknown as string[])
  sortBy?: PatientSortField;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
