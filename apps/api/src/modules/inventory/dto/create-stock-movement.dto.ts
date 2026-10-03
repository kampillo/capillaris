import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsInt,
  Min,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStockMovementDto {
  @ApiProperty({ description: 'Product UUID' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 'entrada', description: 'entrada | salida; usa la dirección explícita para corregir existencias' })
  @IsString()
  @IsNotEmpty()
  @IsIn(['entrada', 'salida'])
  movementType: string;

  @ApiProperty({
    example: 'compra',
    description: 'compra | prescripcion | procedimiento | ajuste_manual | merma | devolucion',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['compra', 'prescripcion', 'procedimiento', 'ajuste_manual', 'merma', 'devolucion'])
  reason: string;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 'prescription' })
  @IsOptional()
  @IsString()
  relatedEntityType?: string;

  @ApiPropertyOptional({ description: 'Related entity UUID' })
  @IsOptional()
  @IsUUID()
  relatedEntityId?: string;

  @ApiPropertyOptional({ example: 'Restock from supplier' })
  @IsOptional()
  @IsString()
  notes?: string;
}
