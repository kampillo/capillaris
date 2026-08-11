import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TreatmentsService } from './treatments.service';
import { CreateTreatmentDto } from './dto/create-treatment.dto';
import { UpdateTreatmentDto } from './dto/update-treatment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('treatments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('treatments')
export class TreatmentsController {
  constructor(private readonly treatmentsService: TreatmentsService) {}

  @Get('types')
  @Roles('admin', 'doctor', 'receptionist')
  @ApiOperation({ summary: 'Catálogo de tipos de tratamiento' })
  types() {
    return this.treatmentsService.listTypes();
  }

  @Post()
  // Enfermería captura estos tratamientos, no sólo los doctores.
  @Roles('admin', 'doctor', 'receptionist')
  @ApiOperation({ summary: 'Registrar un tratamiento' })
  create(
    @Body() dto: CreateTreatmentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.treatmentsService.create(dto, userId);
  }

  @Get('patient/:patientId')
  @Roles('admin', 'doctor', 'receptionist')
  @ApiOperation({ summary: 'Tratamientos de un paciente' })
  findByPatient(@Param('patientId') patientId: string) {
    return this.treatmentsService.findByPatient(patientId);
  }

  @Get(':id')
  @Roles('admin', 'doctor', 'receptionist')
  @ApiOperation({ summary: 'Un tratamiento' })
  findOne(@Param('id') id: string) {
    return this.treatmentsService.findOne(id);
  }

  @Put(':id')
  @Roles('admin', 'doctor', 'receptionist')
  @ApiOperation({ summary: 'Editar un tratamiento' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTreatmentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.treatmentsService.update(id, dto, userId);
  }

  @Delete(':id')
  @Roles('admin', 'doctor')
  @ApiOperation({ summary: 'Eliminar un tratamiento' })
  remove(@Param('id') id: string) {
    return this.treatmentsService.remove(id);
  }
}
