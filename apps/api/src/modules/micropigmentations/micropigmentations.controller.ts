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
import { MicropigmentationsService } from './micropigmentations.service';
import { CreateMicropigmentationDto } from './dto/create-micropigmentation.dto';
import { UpdateMicropigmentationDto } from './dto/update-micropigmentation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('micropigmentations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('micropigmentations')
export class MicropigmentationsController {
  constructor(
    private readonly micropigmentationsService: MicropigmentationsService,
  ) {}

  @Post()
  @Roles('admin', 'doctor')
  @ApiOperation({ summary: 'Create a new micropigmentation record' })
  create(
    @Body() dto: CreateMicropigmentationDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.micropigmentationsService.create(dto, userId);
  }

  @Get()
  @Roles('admin', 'doctor', 'receptionist')
  @ApiOperation({ summary: 'Get all micropigmentations (paginated)' })
  findAll(@Query('page') page?: number, @Query('pageSize') pageSize?: number) {
    return this.micropigmentationsService.findAll(page, pageSize);
  }

  @Get(':id')
  @Roles('admin', 'doctor', 'receptionist')
  @ApiOperation({ summary: 'Get a micropigmentation by ID' })
  findOne(@Param('id') id: string) {
    return this.micropigmentationsService.findOne(id);
  }

  @Put(':id')
  @Roles('admin', 'doctor')
  @ApiOperation({ summary: 'Update a micropigmentation record' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMicropigmentationDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.micropigmentationsService.update(id, dto, userId);
  }

  @Delete(':id')
  @Roles('admin', 'doctor')
  @ApiOperation({ summary: 'Delete a micropigmentation record' })
  remove(@Param('id') id: string) {
    return this.micropigmentationsService.remove(id);
  }
}
