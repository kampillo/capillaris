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
import { ClinicalHistoriesService } from './clinical-histories.service';
import { CreateClinicalHistoryDto } from './dto/create-clinical-history.dto';
import { UpdateClinicalHistoryDto } from './dto/update-clinical-history.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('clinical-histories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clinical-histories')
export class ClinicalHistoriesController {
  constructor(
    private readonly clinicalHistoriesService: ClinicalHistoriesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new clinical history' })
  create(
    @Body() dto: CreateClinicalHistoryDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.clinicalHistoriesService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all clinical histories (paginated)' })
  findAll(@Query('page') page?: number, @Query('pageSize') pageSize?: number) {
    return this.clinicalHistoriesService.findAll(page, pageSize);
  }

  @Get('patient/:patientId')
  @ApiOperation({ summary: 'Get clinical histories by patient' })
  findByPatient(@Param('patientId') patientId: string) {
    return this.clinicalHistoriesService.findByPatient(patientId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a clinical history by ID' })
  findOne(@Param('id') id: string) {
    return this.clinicalHistoriesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a clinical history' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClinicalHistoryDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.clinicalHistoriesService.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a clinical history' })
  remove(@Param('id') id: string) {
    return this.clinicalHistoriesService.remove(id);
  }
}
