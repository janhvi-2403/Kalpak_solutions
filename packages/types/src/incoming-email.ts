import { InboundForwardingStatus } from './enums';

export interface IncomingEmailConfigDto {
  method: string;
  inboundAddress: string;
  status: InboundForwardingStatus;
  lastTestedAt?: string | null;
  lastTestedMessage?: string | null;
  forwardedFromEmail?: string | null;
}

export interface TestIncomingEmailResponse {
  success: boolean;
  status: InboundForwardingStatus;
  message: string;
  lastTestedAt: string;
}

export interface SimulateEmailQueryResponse {
  success: boolean;
  status: string;
  ticketId?: string;
  ticketNumber?: string;
  tenantSlug?: string;
  messageId: string;
  recipient: string;
  sender: string;
  message: string;
}

