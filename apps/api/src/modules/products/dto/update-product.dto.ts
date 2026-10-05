import {
  IsOptional,
  IsString,
  IsUUID,
  IsBoolean,
  IsNumber,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Minoxidil 5%' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'MIN-5-60', type: String, nullable: true })
  @IsOptional()
  @IsString()
  sku?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Category UUID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: 60, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  content?: number | null;

  @ApiPropertyOptional({ example: 'ml' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsString() @MaxLength(30)
  stockUnit?: string | null;

  @ApiPropertyOptional({ example: 350.00, type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  unitPrice?: number | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isMedicine?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  requiresPrescription?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minStockAlert?: number;
}
