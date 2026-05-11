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
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles('admin', 'doctor', 'receptionist')
  @ApiOperation({ summary: 'Create a new appointment' })
  create(
    @Body() createAppointmentDto: CreateAppointmentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.appointmentsService.create(createAppointmentDto, userId);
  }

  @Get()
  @Roles('admin', 'doctor', 'receptionist', 'inventory_manager')
  @ApiOperation({ summary: 'Get all appointments (paginated, optional date range)' })
  findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('timeMin') timeMin?: string,
    @Query('timeMax') timeMax?: string,
  ) {
    return this.appointmentsService.findAll(page, pageSize, timeMin, timeMax);
  }

  @Get(':id')
  @Roles('admin', 'doctor', 'receptionist', 'inventory_manager')
  @ApiOperation({ summary: 'Get an appointment by ID' })
  findOne(@Param('id') id: string) {
    return this.appointmentsService.findOne(id);
  }

  @Put(':id')
  @Roles('admin', 'doctor', 'receptionist')
  @ApiOperation({ summary: 'Update an appointment' })
  update(
    @Param('id') id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.appointmentsService.update(id, updateAppointmentDto, userId);
  }

  @Delete(':id')
  @Roles('admin', 'doctor', 'receptionist')
  @ApiOperation({ summary: 'Delete an appointment' })
  remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.appointmentsService.remove(id, userId);
  }
}
