import { Module } from '@nestjs/common';
import { NursingController } from './nursing.controller';
import { NursingService } from './nursing.service';

@Module({ controllers: [NursingController], providers: [NursingService] })
export class NursingModule {}
