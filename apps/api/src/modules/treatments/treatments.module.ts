import { Module } from '@nestjs/common';
import { TreatmentsService } from './treatments.service';
import { TreatmentsController } from './treatments.controller';
import { TreatmentCareController } from './treatment-care.controller';
import { TreatmentCareService } from './treatment-care.service';

@Module({
  providers: [TreatmentsService, TreatmentCareService],
  controllers: [TreatmentsController, TreatmentCareController],
  exports: [TreatmentsService],
})
export class TreatmentsModule {}
