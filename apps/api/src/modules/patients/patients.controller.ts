import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AuditWriterService } from '../../common/audit/audit-writer.service';
import { PatientsService } from './patients.service';
import { PatientMergeService } from './patient-merge.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { MergePatientsDto } from './dto/merge-patients.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import {
  SearchPatientsDto,
  PatientSortField,
} from './dto/search-patients.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('patients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('patients')
export class PatientsController {
  constructor(
    private readonly patientsService: PatientsService,
    private readonly mergeService: PatientMergeService,
    private readonly audit: AuditWriterService,
  ) {}

  @Post()
  @Roles('admin', 'doctor', 'receptionist')
  @ApiOperation({ summary: 'Create a new patient' })
  create(
    @Body() createPatientDto: CreatePatientDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.patientsService.create(createPatientDto, userId);
  }

  @Get()
  @Roles('admin', 'doctor', 'receptionist', 'inventory_manager')
  @ApiOperation({ summary: 'Get all patients (paginated)' })
  findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('sortBy') sortBy?: PatientSortField,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.patientsService.findAll(page, pageSize, sortBy, sortOrder);
  }

  @Get('duplicates')
  @Roles('admin')
  @ApiOperation({
    summary: 'Grupos de pacientes duplicados, ordenados por riesgo',
  })
  duplicates() {
    return this.mergeService.findDuplicates();
  }

  @Get('search')
  @Roles('admin', 'doctor', 'receptionist', 'inventory_manager')
  @ApiOperation({ summary: 'Search patients' })
  search(@Query() searchDto: SearchPatientsDto) {
    return this.patientsService.search(searchDto);
  }

  @Get('export')
  @Roles('admin')
  @ApiOperation({ summary: 'Exportar todos los pacientes del filtro para conciliación, sin datos clínicos' })
  async exportPatients(@Query() dto: SearchPatientsDto, @Res() res: Response) {
    const workbook = await this.patientsService.exportPatients(dto);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="pacientes-${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.setHeader('Cache-Control', 'no-store');
    await this.audit.write({ action: 'EXPORT', entityType: 'patient_reconciliation', newValues: { format: 'xlsx' } });
    res.send(workbook);
  }

  @Get(':id')
  @Roles('admin', 'doctor', 'receptionist', 'inventory_manager')
  @ApiOperation({ summary: 'Get a patient by ID' })
  findOne(@Param('id') id: string, @CurrentUser('roles') roles: string[]) {
    return this.patientsService.findOneForRoles(id, roles);
  }

  @Put(':id')
  @Roles('admin', 'doctor', 'receptionist')
  @ApiOperation({ summary: 'Update a patient' })
  update(
    @Param('id') id: string,
    @Body() updatePatientDto: UpdatePatientDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.patientsService.update(id, updatePatientDto, userId);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Soft delete a patient' })
  remove(@Param('id') id: string) {
    return this.patientsService.remove(id);
  }

  @Post(':id/merge')
  @Roles('admin')
  @ApiOperation({
    summary: 'Fusiona otro expediente dentro de este',
    description:
      'Reasigna todas las relaciones del absorbido, aplica los campos resueltos y deja al absorbido soft-borrado apuntando a este. Reversible con unmerge.',
  })
  merge(
    @Param('id') survivorId: string,
    @Body() dto: MergePatientsDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.mergeService.merge(survivorId, dto, userId);
  }

  @Post(':id/unmerge')
  @Roles('admin')
  @ApiOperation({ summary: 'Deshace la fusión de este expediente' })
  unmerge(@Param('id') absorbedId: string, @CurrentUser('id') userId: string) {
    return this.mergeService.unmerge(absorbedId, userId);
  }
}
