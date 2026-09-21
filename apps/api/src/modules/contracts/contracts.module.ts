import { Module } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { AuditModule } from '../audit/audit.module';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [AuditModule, TicketsModule],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
