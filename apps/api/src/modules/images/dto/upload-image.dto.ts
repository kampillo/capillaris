import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsBoolean,
  IsInt,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadImageDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ example: 'patients/uuid/photo-001.jpg' })
  @IsString()
  @IsNotEmpty()
  s3Key: string;

  @ApiPropertyOptional({ example: 'capillaris-images' })
  @IsOptional()
  @IsString()
  s3Bucket?: string;

  @ApiPropertyOptional({ example: 'photo-001.jpg' })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ example: 1024000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  fileSizeBytes?: number;

  @ApiPropertyOptional({ example: 'image/jpeg' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isBefore?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isAfter?: boolean;

  @ApiPropertyOptional({ example: 'frontal' })
  @IsOptional()
  @IsString()
  imageType?: string;

  @ApiPropertyOptional({ example: '2024-03-15T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  takenAt?: string;

  @ApiPropertyOptional({ description: 'Procedure Report UUID' })
  @IsOptional()
  @IsUUID()
  procedureReportId?: string;
}
