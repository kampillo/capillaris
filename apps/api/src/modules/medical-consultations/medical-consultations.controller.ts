import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MedicalConsultationsService } from './medical-consultations.service';
import { CreateMedicalConsultationDto } from './dto/create-medical-consultation.dto';
import { UpdateMedicalConsultationDto } from './dto/update-medical-consultation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('medical-consultations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('medical-consultations')
export class MedicalConsultationsController {
  constructor(
    private readonly medicalConsultationsService: MedicalConsultationsService,
  ) {}

  @Post()
  @Roles('admin', 'doctor')
  @ApiOperation({ summary: 'Create a new medical consultation' })
  create(
    @Body() dto: CreateMedicalConsultationDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.medicalConsultationsService.create(dto, userId);
  }

  @Get()
  @Roles('admin', 'doctor', 'receptionist')
  @ApiOperation({ summary: 'Get all medical consultations (paginated)' })
  findAll(@Query('page') page?: number, @Query('pageSize') pageSize?: number) {
    return this.medicalConsultationsService.findAll(page, pageSize);
  }

  @Get('patient/:patientId')
  @Roles('admin', 'doctor', 'receptionist')
  @ApiOperation({ summary: 'Get all consultations for a patient' })
  findByPatient(@Param('patientId') patientId: string) {
    return this.medicalConsultationsService.findByPatient(patientId);
  }

  @Get(':id')
  @Roles('admin', 'doctor', 'receptionist')
  @ApiOperation({ summary: 'Get a medical consultation by ID' })
  findOne(@Param('id') id: string) {
    return this.medicalConsultationsService.findOne(id);
  }

  @Put(':id')
  @Roles('admin', 'doctor')
  @ApiOperation({ summary: 'Update a medical consultation' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMedicalConsultationDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.medicalConsultationsService.update(id, dto, userId);
  }

  @Delete(':id')
  @Roles('admin', 'doctor')
  @ApiOperation({ summary: 'Delete a medical consultation' })
  remove(@Param('id') id: string) {
    return this.medicalConsultationsService.remove(id);
  }
}
