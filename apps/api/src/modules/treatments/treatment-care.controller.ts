import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ClinicalActor } from '../../common/clinical-workspace';
import { CreateTreatmentDto } from './dto/create-treatment.dto';
import { UpdateTreatmentDto } from './dto/update-treatment.dto';
import { TreatmentCareService } from './treatment-care.service';

@Controller('treatment-care')
@Roles('treatment_staff', 'admin', 'doctor')
export class TreatmentCareController {
  constructor(private readonly service: TreatmentCareService) {}

  @Get('patients')
  patients(@CurrentUser() actor: ClinicalActor, @Query('query') query?: string) { return this.service.patients(actor, query); }

  @Get('catalog')
  catalog() { return this.service.catalog(); }

  @Get('patients/:id')
  detail(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: ClinicalActor) { return this.service.detail(id, actor); }

  @Post('patients/:id/treatments')
  create(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateTreatmentDto, @CurrentUser() actor: ClinicalActor) { return this.service.save(id, dto, actor); }

  @Put('patients/:id/treatments/:treatmentId')
  update(@Param('id', ParseUUIDPipe) id: string, @Param('treatmentId', ParseUUIDPipe) treatmentId: string, @Body() dto: UpdateTreatmentDto, @CurrentUser() actor: ClinicalActor) { return this.service.save(id, dto, actor, treatmentId); }
}
