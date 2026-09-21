import { Module } from '@nestjs/common';
import { BootstrapController } from './bootstrap.controller';
import { BootstrapService } from './bootstrap.service';
import { AuditModule } from '../audit/audit.module';
import { MailModule } from '../../core/mail/mail.module';

@Module({
  imports: [AuditModule, MailModule],
  controllers: [BootstrapController],
  providers: [BootstrapService],
  exports: [BootstrapService],
})
export class BootstrapModule {}
