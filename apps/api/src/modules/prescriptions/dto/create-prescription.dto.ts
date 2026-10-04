import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  IsArray,
  ValidateNested,
  IsInt,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePrescriptionItemDto {
  @ApiPropertyOptional({ description: 'Product UUID', type: String, nullable: true })
  @IsOptional()
  @IsUUID()
  productId?: string | null;

  @ApiProperty({ example: 'Minoxidil 5%' })
  @IsString()
  @IsNotEmpty()
  medicineName: string;

  @ApiPropertyOptional({ example: '1ml', type: String, nullable: true })
  @IsOptional()
  @IsString()
  dosage?: string | null;

  @ApiPropertyOptional({ example: '2 veces al dia', type: String, nullable: true })
  @IsOptional()
  @IsString()
  frequency?: string | null;

  @ApiPropertyOptional({ example: 90, type: Number, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number | null;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ example: 'Aplicar en zona afectada', type: String, nullable: true })
  @IsOptional()
  @IsString()
  instructions?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  requiresRefill?: boolean;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  refillReminderDays?: number;
}

export class CreatePrescriptionDto {
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
  prescriptionDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiPropertyOptional({ example: 'active' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: '2024-06-15' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ type: [CreatePrescriptionItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePrescriptionItemDto)
  items?: CreatePrescriptionItemDto[];
}
