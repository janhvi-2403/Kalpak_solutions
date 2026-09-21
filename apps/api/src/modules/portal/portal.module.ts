import { Module } from '@nestjs/common';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { TicketsModule } from '../tickets/tickets.module';
import { DatabaseModule } from '../../core/database/database.module';
import { TenantModule } from '../../core/tenant/tenant.module';
import { ContractsModule } from '../contracts/contracts.module';

@Module({
  imports: [DatabaseModule, TenantModule, TicketsModule, ContractsModule],
  controllers: [PortalController],
  providers: [PortalService],
  exports: [PortalService],
})
export class PortalModule {}
