import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAppointmentDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Doctor UUID' })
  @IsUUID()
  @IsNotEmpty()
  doctorId: string;

  @ApiPropertyOptional({ example: 'Consulta inicial' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Primera evaluacion del paciente' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2024-03-15T10:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  startDatetime: string;

  @ApiProperty({ example: '2024-03-15T11:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  endDatetime: string;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 'scheduled' })
  @IsOptional()
  @IsString()
  status?: string;
}
