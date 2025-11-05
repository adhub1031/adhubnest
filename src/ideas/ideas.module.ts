import { Module } from '@nestjs/common';
import { IdeasController } from './ideas.controller';
import { IdeasService } from './ideas.service';
import { IdeasGateway } from './ideas.gateway';

@Module({
  controllers: [IdeasController],
  providers: [IdeasService, IdeasGateway],
  exports: [IdeasService],
})
export class IdeasModule {}
