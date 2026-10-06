import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../core/database/database.module';
import { TenantModule } from '../../core/tenant/tenant.module';
import { AuditModule } from '../audit/audit.module';
import { TicketsModule } from '../tickets/tickets.module';
import { CustomersModule } from '../customers/customers.module';

import { GmailEmailProvider } from './providers/gmail.provider';
import { MailgunInboundProvider } from './providers/mailgun.provider';
import { ResendInboundProvider } from './providers/resend.provider';
import { PostmarkInboundProvider } from './providers/postmark.provider';
import { GenericInboundProvider } from './providers/generic.provider';
import { CloudMailinInboundProvider } from './providers/cloudmailin.provider';

import { GmailSyncService } from './gmail-sync.service';
import { EmailProviderService } from './email-provider.service';
import { DepartmentRoutingService } from './department-routing.service';
import { TenantResolverService } from './tenant-resolver.service';
import { InboundEmailService } from './inbound-email.service';

import { EmailWebhookController } from './email-webhook.controller';
import { CloudMailinWebhookController } from './cloudmailin-webhook.controller';
import { EmailConfigController } from './email-config.controller';
import { EmailConnectionController } from './email-connection.controller';
import { SupportEmailsService } from './support-emails.service';
import { SupportEmailsController } from './support-emails.controller';
import { IncomingEmailService } from './incoming-email.service';
import { IncomingEmailController } from './incoming-email.controller';
import { OutgoingEmailService } from './outgoing-email.service';
import { OutgoingEmailController } from './outgoing-email.controller';

@Module({
  imports: [
    DatabaseModule,
    TenantModule,
    AuditModule,
    forwardRef(() => TicketsModule),
    CustomersModule,
  ],
  providers: [
    GmailEmailProvider,
    GmailSyncService,
    MailgunInboundProvider,
    ResendInboundProvider,
    PostmarkInboundProvider,
    GenericInboundProvider,
    CloudMailinInboundProvider,
    EmailProviderService,
    DepartmentRoutingService,
    TenantResolverService,
    InboundEmailService,
    SupportEmailsService,
    IncomingEmailService,
    OutgoingEmailService,
  ],
  controllers: [
    EmailConnectionController,
    EmailConfigController,
    EmailWebhookController,
    CloudMailinWebhookController,
    SupportEmailsController,
    IncomingEmailController,
    OutgoingEmailController,
  ],
  exports: [
    GmailEmailProvider,
    GmailSyncService,
    CloudMailinInboundProvider,
    InboundEmailService,
    TenantResolverService,
    EmailProviderService,
    DepartmentRoutingService,
    SupportEmailsService,
    IncomingEmailService,
    OutgoingEmailService,
  ],
})
export class EmailIntegrationModule {}
