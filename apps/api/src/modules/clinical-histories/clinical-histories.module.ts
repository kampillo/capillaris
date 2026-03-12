import { Module } from '@nestjs/common';
import { ClinicalHistoriesService } from './clinical-histories.service';
import { ClinicalHistoriesController } from './clinical-histories.controller';

@Module({
  providers: [ClinicalHistoriesService],
  controllers: [ClinicalHistoriesController],
  exports: [ClinicalHistoriesService],
})
export class ClinicalHistoriesModule {}
