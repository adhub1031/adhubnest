import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { OpenBankController } from './openbank.controller';
import { OpenBankService } from './openbank.service';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [OpenBankController],
  providers: [OpenBankService],
  exports: [OpenBankService],
})
export class OpenBankModule {}
