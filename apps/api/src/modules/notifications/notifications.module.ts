import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EmailNotificationAdapter } from './adapters/email-notification.adapter';
import { WhatsAppNotificationAdapter } from './adapters/whatsapp-notification.adapter';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    EmailNotificationAdapter,
    WhatsAppNotificationAdapter,
  ],
  exports: [NotificationsService, EmailNotificationAdapter, WhatsAppNotificationAdapter],
})
export class NotificationsModule {}
