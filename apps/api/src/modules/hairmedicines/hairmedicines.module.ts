import { Module } from '@nestjs/common';
import { HairmedicinesService } from './hairmedicines.service';
import { HairmedicinesController } from './hairmedicines.controller';

@Module({
  providers: [HairmedicinesService],
  controllers: [HairmedicinesController],
  exports: [HairmedicinesService],
})
export class HairmedicinesModule {}
