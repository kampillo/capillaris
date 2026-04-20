import {
  IsOptional,
  IsString,
  IsDateString,
  IsInt,
  IsArray,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMicropigmentationDto {
  @ApiPropertyOptional({ example: '2024-03-15' })
  @IsOptional()
  @IsDateString()
  fecha?: string;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsInt()
  @Min(1)
  duracion?: number;

  @ApiPropertyOptional({ example: '1:3' })
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
  comments?: string;

  @ApiPropertyOptional({ description: 'Array of hair type UUIDs' })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  hairTypeIds?: string[];
}
