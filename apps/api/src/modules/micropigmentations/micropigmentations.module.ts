import { Module } from '@nestjs/common';
import { MicropigmentationsService } from './micropigmentations.service';
import { MicropigmentationsController } from './micropigmentations.controller';

@Module({
  providers: [MicropigmentationsService],
  controllers: [MicropigmentationsController],
  exports: [MicropigmentationsService],
})
export class MicropigmentationsModule {}
