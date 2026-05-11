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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles('admin', 'inventory_manager')
  @ApiOperation({ summary: 'Create a new product' })
  create(
    @Body() dto: CreateProductDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.productsService.create(dto, userId);
  }

  @Get()
  @Roles('admin', 'doctor', 'receptionist', 'inventory_manager')
  @ApiOperation({ summary: 'Get all products (paginated)' })
  findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('isMedicine') isMedicine?: string,
  ) {
    const filter =
      isMedicine === 'true' ? true : isMedicine === 'false' ? false : undefined;
    return this.productsService.findAll(page, pageSize, filter);
  }

  @Get(':id')
  @Roles('admin', 'doctor', 'receptionist', 'inventory_manager')
  @ApiOperation({ summary: 'Get a product by ID' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Put(':id')
  @Roles('admin', 'inventory_manager')
  @ApiOperation({ summary: 'Update a product' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.productsService.update(id, dto, userId);
  }

  @Delete(':id')
  @Roles('admin', 'inventory_manager')
  @ApiOperation({ summary: 'Deactivate a product' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
