import { Module } from '@nestjs/common';
import { MedicalConsultationsService } from './medical-consultations.service';
import { MedicalConsultationsController } from './medical-consultations.controller';

@Module({
  providers: [MedicalConsultationsService],
  controllers: [MedicalConsultationsController],
  exports: [MedicalConsultationsService],
})
export class MedicalConsultationsModule {}
