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
import { HairmedicinesService } from './hairmedicines.service';
import { CreateHairmedicineDto } from './dto/create-hairmedicine.dto';
import { UpdateHairmedicineDto } from './dto/update-hairmedicine.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('hairmedicines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hairmedicines')
export class HairmedicinesController {
  constructor(private readonly hairmedicinesService: HairmedicinesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new hairmedicine record' })
  create(
    @Body() dto: CreateHairmedicineDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.hairmedicinesService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all hairmedicines (paginated)' })
  findAll(@Query('page') page?: number, @Query('pageSize') pageSize?: number) {
    return this.hairmedicinesService.findAll(page, pageSize);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a hairmedicine by ID' })
  findOne(@Param('id') id: string) {
    return this.hairmedicinesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a hairmedicine record' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateHairmedicineDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.hairmedicinesService.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a hairmedicine record' })
  remove(@Param('id') id: string) {
    return this.hairmedicinesService.remove(id);
  }
}
