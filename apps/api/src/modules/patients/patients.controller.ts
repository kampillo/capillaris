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
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { SearchPatientsDto } from './dto/search-patients.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('patients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

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
  findAll(@Query('page') page?: number, @Query('pageSize') pageSize?: number) {
    return this.patientsService.findAll(page, pageSize);
  }

  @Get('search')
  @Roles('admin', 'doctor', 'receptionist', 'inventory_manager')
  @ApiOperation({ summary: 'Search patients' })
  search(@Query() searchDto: SearchPatientsDto) {
    return this.patientsService.search(searchDto);
  }

  @Get(':id')
  @Roles('admin', 'doctor', 'receptionist', 'inventory_manager')
  @ApiOperation({ summary: 'Get a patient by ID' })
  findOne(@Param('id') id: string) {
    return this.patientsService.findOne(id);
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
  @Roles('admin', 'doctor')
  @ApiOperation({ summary: 'Soft delete a patient' })
  remove(@Param('id') id: string) {
    return this.patientsService.remove(id);
  }
}
