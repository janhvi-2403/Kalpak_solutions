import { OutboundEmailStatus } from './enums';

export interface OutgoingEmailConfigDto {
  senderName: string | null;
  fromEmail: string | null;
  replyToEmail: string | null;
  status: OutboundEmailStatus;
  lastTestedAt?: string | null;
  lastTestedMessage?: string | null;
}

export interface UpdateOutgoingEmailDto {
  senderName?: string;
  fromEmail?: string;
  replyToEmail?: string;
}

export interface SendTestEmailDto {
  recipientEmail: string;
}

export interface SendTestEmailResponse {
  success: boolean;
  status: OutboundEmailStatus;
  message: string;
  lastTestedAt: string;
}
