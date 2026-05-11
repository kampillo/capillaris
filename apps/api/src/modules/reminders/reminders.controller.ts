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
import { RemindersService } from './reminders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('reminders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Post()
  @Roles('admin', 'doctor', 'receptionist')
  @ApiOperation({ summary: 'Create a new reminder' })
  create(
    @Body()
    body: {
      patientId: string;
      reminderType: string;
      scheduledFor: string;
      channel?: string;
      relatedEntityType?: string;
      relatedEntityId?: string;
      messageTemplate?: string;
      messageVariables?: Record<string, unknown>;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.remindersService.create(body, userId);
  }

  @Get()
  @Roles('admin', 'doctor', 'receptionist')
  @ApiOperation({ summary: 'Get all reminders (paginated)' })
  findAll(@Query('page') page?: number, @Query('pageSize') pageSize?: number) {
    return this.remindersService.findAll(page, pageSize);
  }

  @Get('pending')
  @Roles('admin', 'doctor', 'receptionist')
  @ApiOperation({ summary: 'Get pending reminders due for processing' })
  findPending() {
    return this.remindersService.findPending();
  }

  @Get(':id')
  @Roles('admin', 'doctor', 'receptionist')
  @ApiOperation({ summary: 'Get a reminder by ID' })
  findOne(@Param('id') id: string) {
    return this.remindersService.findOne(id);
  }

  @Put(':id')
  @Roles('admin', 'doctor', 'receptionist')
  @ApiOperation({ summary: 'Update a reminder status' })
  update(
    @Param('id') id: string,
    @Body() body: { status?: string; sentAt?: string; errorMessage?: string },
  ) {
    return this.remindersService.update(id, body);
  }

  @Delete(':id')
  @Roles('admin', 'doctor', 'receptionist')
  @ApiOperation({ summary: 'Cancel a reminder' })
  remove(@Param('id') id: string) {
    return this.remindersService.remove(id);
  }
}
