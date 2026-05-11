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
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('prescriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Post()
  @Roles('admin', 'doctor')
  @ApiOperation({ summary: 'Create a new prescription' })
  create(
    @Body() createPrescriptionDto: CreatePrescriptionDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.prescriptionsService.create(createPrescriptionDto, userId);
  }

  @Get()
  @Roles('admin', 'doctor', 'receptionist')
  @ApiOperation({ summary: 'Get all prescriptions (paginated)' })
  findAll(@Query('page') page?: number, @Query('pageSize') pageSize?: number) {
    return this.prescriptionsService.findAll(page, pageSize);
  }

  @Get(':id')
  @Roles('admin', 'doctor', 'receptionist')
  @ApiOperation({ summary: 'Get a prescription by ID' })
  findOne(@Param('id') id: string) {
    return this.prescriptionsService.findOne(id);
  }

  @Put(':id')
  @Roles('admin', 'doctor')
  @ApiOperation({ summary: 'Update a prescription' })
  update(
    @Param('id') id: string,
    @Body() updatePrescriptionDto: UpdatePrescriptionDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.prescriptionsService.update(id, updatePrescriptionDto, userId);
  }

  @Delete(':id')
  @Roles('admin', 'doctor')
  @ApiOperation({ summary: 'Delete a prescription' })
  remove(@Param('id') id: string) {
    return this.prescriptionsService.remove(id);
  }
}
