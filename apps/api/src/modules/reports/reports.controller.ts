import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'doctor', 'inventory_manager')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('patients')
  @ApiOperation({ summary: 'Patients report (KPIs + monthly series)' })
  getPatientsReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getPatientsReport(startDate, endDate);
  }

  @Get('procedures')
  @ApiOperation({ summary: 'Procedures report (KPIs + by doctor)' })
  getProceduresReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getProceduresReport(startDate, endDate);
  }

  @Get('appointments')
  @ApiOperation({ summary: 'Appointments report (status distribution + rates)' })
  getAppointmentsReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getAppointmentsReport(startDate, endDate);
  }

  @Get('prescriptions')
  @ApiOperation({ summary: 'Prescriptions report (issued + active)' })
  getPrescriptionsReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getPrescriptionsReport(startDate, endDate);
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Inventory report (low stock + top moved)' })
  getInventoryReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getInventoryReport(startDate, endDate);
  }

  @Get('sources')
  @ApiOperation({ summary: 'Patient sources / channels (marketing)' })
  getSourcesReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getSourcesReport(startDate, endDate);
  }

  @Get('clinical')
  @ApiOperation({ summary: 'Clinical insights (variants + donor zones)' })
  getClinicalReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getClinicalReport(startDate, endDate);
  }

  @Get('sales')
  @ApiOperation({ summary: 'Sales report (legacy)' })
  getSalesReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getSalesReport(startDate, endDate);
  }
}
