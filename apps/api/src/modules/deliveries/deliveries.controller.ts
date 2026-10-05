import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateDeliveryDto, ReverseDeliveryDto } from './dto/delivery.dto';
import { DeliveriesService } from './deliveries.service';

@ApiTags('deliveries') @ApiBearerAuth()
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveries: DeliveriesService) {}

  @Post() @Roles('admin', 'receptionist', 'inventory_manager')
  create(@Body() dto: CreateDeliveryDto, @Headers('idempotency-key') key: string, @CurrentUser('id') actor: string) {
    return this.deliveries.confirm(dto, key, actor);
  }

  @Post(':id/reversal') @Roles('admin')
  reverse(@Param('id') id: string, @Body() dto: ReverseDeliveryDto, @Headers('idempotency-key') key: string, @CurrentUser('id') actor: string) {
    return this.deliveries.reverse(id, dto, key, actor);
  }

  @Get() @Roles('admin', 'receptionist', 'inventory_manager')
  list(@Query('page') page?: number, @Query('prescriptionId') prescriptionId?: string) {
    return this.deliveries.list(page, prescriptionId);
  }

  @Get('prescriptions') @Roles('admin', 'receptionist', 'inventory_manager')
  search(@Query('query') query: string) { return this.deliveries.searchPrescriptions(query); }

  @Get(':id') @Roles('admin', 'receptionist', 'inventory_manager')
  get(@Param('id') id: string) { return this.deliveries.get(id); }
}

@ApiTags('deliveries') @ApiBearerAuth()
@Controller('prescriptions')
export class FulfillmentController {
  constructor(private readonly deliveries: DeliveriesService) {}
  @Get(':id/fulfillment') @Roles('admin', 'doctor', 'receptionist', 'inventory_manager')
  get(@Param('id') id: string) { return this.deliveries.fulfillment(id); }
}
