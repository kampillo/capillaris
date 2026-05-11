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
import { ImagesService } from './images.service';
import { UploadImageDto } from './dto/upload-image.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('images')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post()
  @Roles('admin', 'doctor')
  @ApiOperation({ summary: 'Upload a patient image record' })
  create(
    @Body() dto: UploadImageDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.imagesService.create(dto, userId);
  }

  @Get()
  @Roles('admin', 'doctor', 'receptionist')
  @ApiOperation({ summary: 'Get all images (paginated)' })
  findAll(@Query('page') page?: number, @Query('pageSize') pageSize?: number) {
    return this.imagesService.findAll(page, pageSize);
  }

  @Get('patient/:patientId')
  @Roles('admin', 'doctor', 'receptionist')
  @ApiOperation({ summary: 'Get images for a specific patient' })
  findByPatient(@Param('patientId') patientId: string) {
    return this.imagesService.findByPatient(patientId);
  }

  @Get(':id')
  @Roles('admin', 'doctor', 'receptionist')
  @ApiOperation({ summary: 'Get an image by ID' })
  findOne(@Param('id') id: string) {
    return this.imagesService.findOne(id);
  }

  @Put(':id')
  @Roles('admin', 'doctor')
  @ApiOperation({ summary: 'Update image metadata' })
  update(
    @Param('id') id: string,
    @Body()
    body: {
      isFavorite?: boolean;
      isBefore?: boolean;
      isAfter?: boolean;
      imageType?: string;
    },
  ) {
    return this.imagesService.update(id, body);
  }

  @Delete(':id')
  @Roles('admin', 'doctor')
  @ApiOperation({ summary: 'Delete an image' })
  remove(@Param('id') id: string) {
    return this.imagesService.remove(id);
  }
}
