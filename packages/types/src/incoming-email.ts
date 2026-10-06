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
