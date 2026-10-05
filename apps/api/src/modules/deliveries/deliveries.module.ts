import { Module } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { DeliveriesController, FulfillmentController } from './deliveries.controller';

@Module({ providers: [DeliveriesService], controllers: [DeliveriesController, FulfillmentController] })
export class DeliveriesModule {}
