import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @Roles('admin', 'doctor', 'receptionist', 'inventory_manager')
  @ApiOperation({ summary: 'Get current inventory balances' })
  getInventory(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.inventoryService.getInventory(page, pageSize);
  }

  @Get('low-stock')
  @Roles('admin', 'doctor', 'receptionist', 'inventory_manager')
  @ApiOperation({ summary: 'Get products with low stock' })
  getLowStock() {
    return this.inventoryService.getLowStock();
  }

  @Post('movements')
  @Roles('admin', 'inventory_manager')
  @ApiOperation({ summary: 'Create a stock movement' })
  createMovement(
    @Body() dto: CreateStockMovementDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.inventoryService.createMovement(dto, userId);
  }

  @Get('movements')
  @Roles('admin', 'doctor', 'receptionist', 'inventory_manager')
  @ApiOperation({ summary: 'Get all stock movements (paginated)' })
  getAllMovements(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.inventoryService.getAllMovements(page, pageSize);
  }

  @Get('movements/:productId')
  @Roles('admin', 'doctor', 'receptionist', 'inventory_manager')
  @ApiOperation({ summary: 'Get stock movements for a product' })
  getMovements(
    @Param('productId') productId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.inventoryService.getMovements(productId, page, pageSize);
  }
}
