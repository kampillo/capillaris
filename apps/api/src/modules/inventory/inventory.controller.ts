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
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get current inventory balances' })
  getInventory(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.inventoryService.getInventory(page, pageSize);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get products with low stock' })
  getLowStock() {
    return this.inventoryService.getLowStock();
  }

  @Post('movements')
  @ApiOperation({ summary: 'Create a stock movement' })
  createMovement(
    @Body() dto: CreateStockMovementDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.inventoryService.createMovement(dto, userId);
  }

  @Get('movements')
  @ApiOperation({ summary: 'Get all stock movements (paginated)' })
  getAllMovements(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.inventoryService.getAllMovements(page, pageSize);
  }

  @Get('movements/:productId')
  @ApiOperation({ summary: 'Get stock movements for a product' })
  getMovements(
    @Param('productId') productId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.inventoryService.getMovements(productId, page, pageSize);
  }
}
