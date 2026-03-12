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
import { ProceduresService } from './procedures.service';
import { CreateProcedureDto } from './dto/create-procedure.dto';
import { UpdateProcedureDto } from './dto/update-procedure.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('procedures')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('procedures')
export class ProceduresController {
  constructor(private readonly proceduresService: ProceduresService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new procedure report' })
  create(
    @Body() dto: CreateProcedureDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.proceduresService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all procedure reports (paginated)' })
  findAll(@Query('page') page?: number, @Query('pageSize') pageSize?: number) {
    return this.proceduresService.findAll(page, pageSize);
  }

  @Get('patient/:patientId')
  @ApiOperation({ summary: 'Get all procedures for a patient' })
  findByPatient(@Param('patientId') patientId: string) {
    return this.proceduresService.findByPatient(patientId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a procedure report by ID' })
  findOne(@Param('id') id: string) {
    return this.proceduresService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a procedure report' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProcedureDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.proceduresService.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a procedure report' })
  remove(@Param('id') id: string) {
    return this.proceduresService.remove(id);
  }
}
