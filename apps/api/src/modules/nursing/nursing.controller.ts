import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ArrayMaxSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NursingActor, NursingService } from './nursing.service';
import { CreateProcedureDto } from '../procedures/dto/create-procedure.dto';
import { UpdateProcedureDto } from '../procedures/dto/update-procedure.dto';

class AssignDto { @IsUUID() nurseId: string; }
class ParticipantsDto {
  @IsArray() @ArrayUnique() @ArrayMaxSize(30) @IsUUID(undefined, { each: true }) nurseIds: string[];
}

@Controller('nursing')
export class NursingController {
  constructor(private readonly service: NursingService) {}

  @Get('catalog') @Roles('nurse', 'admin', 'doctor')
  catalog() { return this.service.catalog(); }

  @Get('staff') @Roles('admin', 'doctor')
  staff() { return this.service.staff(); }

  @Get('patients') @Roles('nurse')
  patients(@CurrentUser() actor: NursingActor, @Query('query') query?: string) { return this.service.patients(actor, query); }

  @Get('patients/:id') @Roles('nurse', 'admin', 'doctor')
  detail(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: NursingActor) { return this.service.detail(id, actor); }

  @Get('patients/:id/assignments') @Roles('admin', 'doctor')
  assignments(@Param('id', ParseUUIDPipe) id: string) { return this.service.assignments(id); }

  @Post('patients/:id/assignments') @Roles('admin', 'doctor')
  assign(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignDto, @CurrentUser() actor: NursingActor) { return this.service.assign(id, dto.nurseId, actor); }

  @Post('patients/:id/assignments/revoke') @Roles('admin', 'doctor')
  revoke(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignDto, @CurrentUser() actor: NursingActor) { return this.service.assign(id, dto.nurseId, actor, true); }

  @Post('patients/:id/procedures') @Roles('nurse', 'admin', 'doctor')
  create(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateProcedureDto, @CurrentUser() actor: NursingActor) { return this.service.save(id, dto, actor); }

  @Put('patients/:id/procedures/:procedureId') @Roles('nurse', 'admin', 'doctor')
  update(@Param('id', ParseUUIDPipe) id: string, @Param('procedureId', ParseUUIDPipe) procedureId: string, @Body() dto: UpdateProcedureDto, @CurrentUser() actor: NursingActor) { return this.service.save(id, dto, actor, procedureId); }

  @Put('procedures/:id/participants') @Roles('nurse', 'admin', 'doctor')
  participants(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ParticipantsDto, @CurrentUser() actor: NursingActor) { return this.service.participants(id, dto.nurseIds, actor); }
}
