import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, Equals, IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class DeliveryLineDto {
  @IsOptional() @IsUUID() productId?: string;
  @IsOptional() @IsUUID() prescriptionItemId?: string;
  @IsInt() @Min(1) @Max(2147483647) quantity: number;
}

export class CreateDeliveryDto {
  @IsIn(['prescription', 'direct']) source: 'prescription' | 'direct';
  @IsOptional() @IsUUID() prescriptionId?: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50)
  @ValidateNested({ each: true }) @Type(() => DeliveryLineDto)
  lines: DeliveryLineDto[];
}

export class ReverseDeliveryDto {
  @IsString() @IsNotEmpty() @MaxLength(500) reason: string;
  @Equals(true, { message: 'Confirma que todos los envases están físicamente disponibles para reincorporarlos' })
  @Transform(({ obj, key }) => obj[key], { toClassOnly: true })
  physicalStockConfirmed: boolean;
}
