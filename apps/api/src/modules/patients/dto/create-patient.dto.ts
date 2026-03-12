import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEmail,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePatientDto {
  @ApiProperty({ example: 'Juan' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'Perez' })
  @IsString()
  @IsNotEmpty()
  apellido: string;

  @ApiPropertyOptional({ example: 'juan@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+52 55 1234 5678' })
  @IsOptional()
  @IsString()
  celular?: string;

  @ApiPropertyOptional({ example: 'Calle Reforma 123, CDMX' })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiPropertyOptional({ example: '1985-06-15' })
  @IsOptional()
  @IsDateString()
  fechaNacimiento?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  edadApproximada?: boolean;

  @ApiPropertyOptional({ example: 'hombre' })
  @IsOptional()
  @IsString()
  genero?: string;

  @ApiPropertyOptional({ example: 'casado/a' })
  @IsOptional()
  @IsString()
  estadoCivil?: string;

  @ApiPropertyOptional({ example: 'profesionista' })
  @IsOptional()
  @IsString()
  ocupacion?: string;

  @ApiPropertyOptional({ example: 'lead' })
  @IsOptional()
  @IsString()
  tipoPaciente?: string;

  @ApiPropertyOptional({ example: 'facebook' })
  @IsOptional()
  @IsString()
  origenCanal?: string;

  @ApiPropertyOptional({ example: 'Dr. Lopez' })
  @IsOptional()
  @IsString()
  referidoPor?: string;

  @ApiPropertyOptional({ example: 'Ciudad de Mexico' })
  @IsOptional()
  @IsString()
  ciudad?: string;

  @ApiPropertyOptional({ example: 'CDMX' })
  @IsOptional()
  @IsString()
  estado?: string;

  @ApiPropertyOptional({ example: 'Mexico' })
  @IsOptional()
  @IsString()
  pais?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  consentDataProcessing?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  consentMarketing?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notasInternas?: string;
}
