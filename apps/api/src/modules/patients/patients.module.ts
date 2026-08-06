import { Module } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PatientMergeService } from './patient-merge.service';
import { PatientsController } from './patients.controller';

@Module({
  providers: [PatientsService, PatientMergeService],
  controllers: [PatientsController],
  exports: [PatientsService],
})
export class PatientsModule {}
