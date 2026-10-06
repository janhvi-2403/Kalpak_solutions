import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  BadGatewayException,
} from '@nestjs/common';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { PrismaService } from '../../core/database/prisma.service';
import { getConfig } from '@kalpak/config';
import { logger } from '@kalpak/logger';
import { CreatePaymentOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { PlanPricing } from '@kalpak/types';

// Official Plan Pricing Structure (Server-side ground truth in INR)
export const PLAN_PRICING: Record<'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE', PlanPricing> = {
  STARTER: {
    plan: 'STARTER',
    monthlyPrice: 2999, // ₹2,999 / month
    annualMonthlyPrice: 2399, // ₹2,399 / month (Save 20%)
    annualTotalPrice: 28788, // ₹28,788 / year
    discountPercent: 20,
    maxTechnicians: 5,
    features: [
      'Ticket & Service Call Management',
      'Customer & Employee Profiles',
      'Centralized Status & SLA Tracking',
      '2FA Security & Audit Logs',
      'Up to 5 Technicians / Staff',
      'Unlimited Service Tickets',
    ],
  },
  PROFESSIONAL: {
    plan: 'PROFESSIONAL',
    monthlyPrice: 6999,
    annualMonthlyPrice: 5599,
    annualTotalPrice: 67188,
    discountPercent: 20,
    maxTechnicians: 25,
    features: [
      'Everything in Starter',
      'Automatic Skill & Dept Ticket Routing',
      'Workload Balancing & Aging Alerts',
      'Up to 25 Technicians',
    ],
  },
  ENTERPRISE: {
    plan: 'ENTERPRISE',
    monthlyPrice: 14999,
    annualMonthlyPrice: 11999,
    annualTotalPrice: 143988,
    discountPercent: 20,
    maxTechnicians: 9999,
    features: [
      'Everything in Professional',
      'Multi-Location / Multi-Org Management',
      'Custom ERP & API Integrations',
      'Dedicated Account Manager',
    ],
  },
};

const GST_RATE = 0.18; // 18% GST

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private getRazorpayConfig() {
    const config = getConfig();
    const keyId = (config.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '').trim();
    const keySecret = (config.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || '').trim();
    const webhookSecret = (config.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();

    const isConfigured = Boolean(
      keyId.length > 0 &&
      keySecret.length > 0 &&
      !keyId.includes('mock') &&
      !keySecret.includes('mock')
    );

    return { keyId, keySecret, webhookSecret, isConfigured };
  }

  /**
   * 1. Validate security, calculate price + GST, create REAL Razorpay Order & Pending Subscription
   */
  async createOrder(
    userId: string,
    tenantId: string,
    dto: CreatePaymentOrderDto,
    userIp?: string
  ) {
    if (!dto.agreedToTerms) {
      throw new BadRequestException('You must agree to the Terms of Service to proceed.');
    }

    // A. Verify Tenant Exists and User has Admin Role in that Tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        policy: true,
        memberships: {
          where: { userId },
          include: { role: true },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant organization not found.');
    }

    const membership = tenant.memberships[0];
    if (!membership) {
      throw new ForbiddenException('User is not a member of this tenant.');
    }

    const roleName = membership.role?.name?.toUpperCase() || '';
    const isAdmin = roleName.includes('ADMIN') || roleName.includes('OWNER') || roleName.includes('CLIENT_ADMIN');
    if (!isAdmin) {
      throw new ForbiddenException('Only a Client Administrator or Owner can manage subscriptions.');
    }

    // B. Server-side price calculation (ground truth)
    const pricing = PLAN_PRICING[dto.plan];
    if (!pricing) {
      throw new BadRequestException(`Unsupported plan: ${dto.plan}`);
    }

    const baseAmount = dto.billingCycle === 'ANNUAL' ? pricing.annualTotalPrice : pricing.monthlyPrice;
    const gstAmount = Math.round(baseAmount * GST_RATE);
    const totalAmount = baseAmount + gstAmount; // in INR
    const totalAmountInPaise = totalAmount * 100; // Razorpay requires paise

    // C. Fetch user details for Razorpay prefill
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // D. Call REAL Razorpay API to create order
    const { keyId, keySecret, isConfigured } = this.getRazorpayConfig();
    if (!isConfigured) {
      throw new BadGatewayException(
        'Razorpay payment gateway credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are not configured on the server. Please set valid Razorpay API keys in environment variables.'
      );
    }

    const receipt = `rcpt_${tenant.slug.slice(0, 8)}_${Date.now().toString().slice(-8)}`;

    let orderId: string;
    try {
      const razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });

      const razorpayOrder = await razorpay.orders.create({
        amount: totalAmountInPaise,
        currency: 'INR',
        receipt,
        notes: {
          tenantId,
          tenantSlug: tenant.slug,
          userId,
          plan: dto.plan,
          billingCycle: dto.billingCycle,
          gstin: dto.gstin || '',
        },
      });

      if (!razorpayOrder || !razorpayOrder.id) {
        throw new Error('Razorpay Orders API did not return an order ID');
      }

      orderId = razorpayOrder.id;
    } catch (err: any) {
      const errMsg = err?.error?.description || err?.message || 'Failed to create Razorpay order';
      logger.error({ err, tenantId, plan: dto.plan }, 'Razorpay Orders API error');
      throw new BadGatewayException(`Razorpay Order creation failed: ${errMsg}`);
    }

    // E. Initial Subscription status = PENDING_PAYMENT (Starter has no trial)
    const now = new Date();
    const durationMonths = dto.billingCycle === 'ANNUAL' ? 12 : 1;
    const endsAt = new Date(now);
    endsAt.setMonth(endsAt.getMonth() + durationMonths);

    await this.prisma.$transaction(async (tx) => {
      // Create or update subscription record as PENDING_PAYMENT
      await tx.subscription.create({
        data: {
          tenantId,
          plan: dto.plan,
          billingCycle: dto.billingCycle,
          status: 'PENDING_PAYMENT',
          amount: totalAmount,
          taxAmount: gstAmount,
          currency: 'INR',
          startsAt: now,
          endsAt,
          gatewayOrderId: orderId,
          metadata: {
            initiatedByUserId: userId,
            receipt,
            baseAmount,
            gstAmount,
            gstin: dto.gstin || null,
          },
        },
      });

      // Record pending PaymentTransaction
      await tx.paymentTransaction.create({
        data: {
          tenantId,
          userId,
          orderId,
          amount: totalAmount,
          currency: 'INR',
          status: 'CREATED',
          plan: dto.plan,
          billingCycle: dto.billingCycle,
          rawGatewayResponse: {
            receipt,
            baseAmount,
            gstAmount,
            gstin: dto.gstin || null,
            billingAddress: dto.billingAddress ? { ...dto.billingAddress } : null,
            ip: userIp || null,
          } as any,
        },
      });
    });

    logger.info(
      { tenantId, plan: dto.plan, billingCycle: dto.billingCycle, orderId, totalAmount },
      'Razorpay order and pending subscription created successfully'
    );

    return {
      orderId,
      amount: totalAmountInPaise,
      amountInRupees: totalAmount,
      baseAmount,
      gstAmount,
      currency: 'INR',
      keyId,
      plan: dto.plan,
      billingCycle: dto.billingCycle,
      companyName: tenant.name,
      customerEmail: user?.email || '',
      customerPhone: user?.phoneNumber || tenant.policy?.notificationChannels || '',
    };
  }

  /**
   * 2. Verify Razorpay cryptographic HMAC SHA-256 signature and activate subscription
   */
  async verifyPayment(
    userId: string,
    tenantId: string,
    dto: VerifyPaymentDto
  ) {
    const { keySecret, isConfigured } = this.getRazorpayConfig();
    if (!isConfigured) {
      throw new BadGatewayException(
        'Razorpay payment gateway credentials (RAZORPAY_KEY_SECRET) are not configured on the server.'
      );
    }

    if (!dto.razorpay_order_id || !dto.razorpay_payment_id || !dto.razorpay_signature) {
      throw new BadRequestException('Missing required Razorpay payment verification parameters.');
    }

    // A. Find existing transaction
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { orderId: dto.razorpay_order_id },
    });

    if (!transaction || transaction.tenantId !== tenantId) {
      throw new NotFoundException('Transaction record matching this order was not found for your organization.');
    }

    // B. Check for duplicate processing / Idempotency
    if (transaction.status === 'CAPTURED') {
      if (transaction.paymentId === dto.razorpay_payment_id) {
        const activeSub = await this.prisma.subscription.findFirst({
          where: { tenantId, gatewayOrderId: dto.razorpay_order_id, status: 'ACTIVE' },
        });
        return {
          success: true,
          message: 'Payment has already been verified and processed.',
          subscriptionId: activeSub?.id || transaction.id,
          plan: transaction.plan,
          billingCycle: transaction.billingCycle,
          status: 'ACTIVE' as const,
          startsAt: activeSub?.startsAt.toISOString() || transaction.createdAt.toISOString(),
          endsAt: activeSub?.endsAt.toISOString() || new Date(Date.now() + 30 * 86400000).toISOString(),
          redirectUrl: '/dashboard',
        };
      }
      throw new BadRequestException('This order has already been captured with a different payment ID.');
    }

    // C. Verify cryptographic HMAC SHA-256 Signature (REAL Razorpay verification)
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${dto.razorpay_order_id}|${dto.razorpay_payment_id}`)
      .digest('hex');

    const signatureBuffer = Buffer.from(dto.razorpay_signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    const isValidSignature =
      signatureBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

    if (!isValidSignature) {
      // Log payment failure in database
      await this.prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          errorMessage: 'Cryptographic HMAC signature verification failed',
        },
      });

      throw new BadRequestException('Payment verification failed: Invalid transaction signature.');
    }

    // D. Calculate subscription timeframe
    const now = new Date();
    const durationMonths = transaction.billingCycle === 'ANNUAL' ? 12 : 1;

    // Check if there is an existing active subscription that hasn't expired yet for renewal extension
    const existingActiveSub = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: 'ACTIVE',
        endsAt: { gt: now },
      },
      orderBy: { endsAt: 'desc' },
    });

    const isRenewal = !!existingActiveSub && existingActiveSub.plan === transaction.plan;
    const baseStartDate = isRenewal ? new Date(existingActiveSub.endsAt) : new Date(now);
    const endsAt = new Date(baseStartDate);
    endsAt.setMonth(endsAt.getMonth() + durationMonths);

    const planLimits = PLAN_PRICING[transaction.plan];

    // D. Perform atomic activation in database transaction
    const [, subscription] = await this.prisma.$transaction(async (tx) => {
      // 1. Update Payment Transaction to CAPTURED
      const uTx = await tx.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'CAPTURED',
          paymentId: dto.razorpay_payment_id,
          signature: dto.razorpay_signature,
        },
      });

      // If upgrading to a different tier, expire earlier active subscriptions
      if (!isRenewal) {
        await tx.subscription.updateMany({
          where: { tenantId, status: 'ACTIVE' },
          data: { status: 'EXPIRED' },
        });
      }

      // 2. Find latest pending subscription or create new active subscription
      const existingSub = await tx.subscription.findFirst({
        where: { tenantId, gatewayOrderId: dto.razorpay_order_id },
        orderBy: { createdAt: 'desc' },
      });

      let sub;
      if (existingSub) {
        sub = await tx.subscription.update({
          where: { id: existingSub.id },
          data: {
            status: 'ACTIVE',
            startsAt: isRenewal ? baseStartDate : now,
            endsAt,
            gatewayPaymentId: dto.razorpay_payment_id,
            metadata: {
              ...(typeof existingSub.metadata === 'object' && existingSub.metadata !== null
                ? existingSub.metadata
                : {}),
              verifiedByUserId: userId,
              verifiedAt: now.toISOString(),
              type: isRenewal ? 'RENEWAL' : 'PURCHASE_OR_UPGRADE',
            },
          },
        });
      } else {
        sub = await tx.subscription.create({
          data: {
            tenantId,
            plan: transaction.plan,
            billingCycle: transaction.billingCycle,
            status: 'ACTIVE',
            amount: transaction.amount,
            taxAmount: Math.round(Number(transaction.amount) * 0.18 / 1.18),
            currency: 'INR',
            startsAt: isRenewal ? baseStartDate : now,
            endsAt,
            gatewayOrderId: dto.razorpay_order_id,
            gatewayPaymentId: dto.razorpay_payment_id,
            metadata: {
              purchasedByUserId: userId,
              verifiedAt: now.toISOString(),
              type: isRenewal ? 'RENEWAL' : 'PURCHASE_OR_UPGRADE',
            },
          },
        });
      }

      // 3. Activate Tenant Status
      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          status: 'ACTIVE',
        },
      });

      // 4. Update Tenant Policy subscription dates and limits
      await tx.tenantPolicy.upsert({
        where: { tenantId },
        create: {
          tenantId,
          subscriptionStartsAt: now,
          subscriptionEndsAt: endsAt,
          maxUsersQuota: planLimits.maxTechnicians,
        },
        update: {
          subscriptionStartsAt: now,
          subscriptionEndsAt: endsAt,
          maxUsersQuota: planLimits.maxTechnicians,
        },
      });

      // 5. Create immutable audit event
      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId: userId,
          eventType: 'SUBSCRIPTION_PURCHASED',
          resourceType: 'Subscription',
          resourceId: sub.id,
          action: 'PURCHASE',
          metadata: {
            plan: transaction.plan,
            billingCycle: transaction.billingCycle,
            amount: (transaction.amount ?? 0).toString(),
            orderId: dto.razorpay_order_id,
            paymentId: dto.razorpay_payment_id,
          },
        },
      });

      return [uTx, sub];
    });

    logger.info(
      { tenantId, subscriptionId: subscription.id, plan: transaction.plan, endsAt },
      'Subscription successfully activated for tenant'
    );

    return {
      success: true,
      message: 'Payment verified and Starter Plan subscription successfully activated.',
      subscriptionId: subscription.id,
      plan: transaction.plan,
      billingCycle: transaction.billingCycle,
      status: subscription.status,
      startsAt: now.toISOString(),
      endsAt: endsAt.toISOString(),
      redirectUrl: '/dashboard',
    };
  }

  /**
   * 2b. Explicitly record payment cancellation or client-side failure
   */
  async recordPaymentFailure(
    tenantId: string,
    dto: { orderId: string; reason?: string }
  ) {
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { orderId: dto.orderId },
    });

    if (!transaction || transaction.tenantId !== tenantId) {
      throw new NotFoundException('Transaction record not found.');
    }

    if (transaction.status === 'CAPTURED') {
      return transaction;
    }

    return this.prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: 'FAILED',
        errorMessage: dto.reason || 'Payment was declined or cancelled by the user.',
      },
    });
  }

  /**
   * 3. Webhook listener for background payment reconciliation with cryptographic verification and idempotency
   */
  async processWebhook(rawBodyBuffer: Buffer, signature: string, eventIdHeader?: string) {
    const { webhookSecret } = this.getRazorpayConfig();

    // A. Cryptographic Signature Verification (HMAC-SHA256)
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBodyBuffer)
      .digest('hex');

    const signatureBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    const isValidSignature =
      signatureBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

    if (!isValidSignature) {
      logger.warn('[Webhook] Razorpay webhook signature verification failed');
      throw new BadRequestException('Invalid webhook signature');
    }

    // B. Parse JSON Payload
    let payload: any;
    try {
      payload = JSON.parse(rawBodyBuffer.toString('utf8'));
    } catch {
      throw new BadRequestException('Malformed JSON body');
    }

    // C. Extract Unique Event ID for Idempotency
    const eventType: string = payload.event || 'unknown';
    const eventId: string =
      eventIdHeader ||
      payload.id ||
      payload.event_id ||
      `${eventType}_${payload.payload?.payment?.entity?.id || payload.payload?.order?.entity?.id || Date.now()}`;

    // D. Idempotency Check: Store/process event IDs so the same webhook cannot activate twice
    const existingEvent = await this.prisma.webhookEvent.findUnique({
      where: { eventId },
    });

    if (existingEvent) {
      logger.info(
        { eventId, eventType, status: existingEvent.status },
        '[Webhook] Duplicate Razorpay event received - skipping processing (idempotent)'
      );
      return {
        status: 'already_processed',
        eventId,
        message: 'Webhook event was already processed previously.',
      };
    }

    // E. Extract Order and Payment Entities
    const paymentEntity = payload.payload?.payment?.entity;
    const orderEntity = payload.payload?.order?.entity;
    const orderId: string | undefined = orderEntity?.id || paymentEntity?.order_id;
    const paymentId: string | undefined = paymentEntity?.id;
    const paymentMethod: string | undefined = paymentEntity?.method;

    logger.info(
      { eventId, eventType, orderId, paymentId },
      '[Webhook] Processing verified Razorpay event'
    );

    // F. Handle Event Types in Atomic Database Transactions
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      if (!orderId && !paymentId) {
        // Record event and finish
        await this.prisma.webhookEvent.create({
          data: {
            eventId,
            event: eventType,
            status: 'IGNORED_NO_ENTITY',
            payload: payload as any,
          },
        });
        return { status: 'ok', message: 'No order or payment entity found' };
      }

      // Find transaction
      const transaction = await this.prisma.paymentTransaction.findFirst({
        where: {
          OR: [
            ...(orderId ? [{ orderId }] : []),
            ...(paymentId ? [{ paymentId }] : []),
          ],
        },
        include: {
          tenant: {
            include: { policy: true },
          },
        },
      });

      if (!transaction) {
        logger.warn(
          { orderId, paymentId, eventId },
          '[Webhook] No matching payment transaction found in database'
        );
        await this.prisma.webhookEvent.create({
          data: {
            eventId,
            event: eventType,
            status: 'IGNORED_UNMATCHED',
            payload: payload as any,
          },
        });
        return { status: 'ok', message: 'Unmatched transaction recorded' };
      }

      const tenantId = transaction.tenantId;
      const now = new Date();
      const durationMonths = transaction.billingCycle === 'ANNUAL' ? 12 : 1;
      const endsAt = new Date(now);
      endsAt.setMonth(endsAt.getMonth() + durationMonths);
      const planLimits = PLAN_PRICING[transaction.plan] || PLAN_PRICING.STARTER;

      await this.prisma.$transaction(async (tx) => {
        // 1. Record Webhook Event for idempotency
        await tx.webhookEvent.create({
          data: {
            eventId,
            event: eventType,
            status: 'PROCESSED',
            payload: payload as any,
          },
        });

        // 2. Update Payment Transaction to CAPTURED
        await tx.paymentTransaction.update({
          where: { id: transaction.id },
          data: {
            status: 'CAPTURED',
            paymentId: paymentId || transaction.paymentId,
            paymentMethod: paymentMethod || transaction.paymentMethod,
            rawGatewayResponse: {
              ...(typeof transaction.rawGatewayResponse === 'object' && transaction.rawGatewayResponse !== null
                ? transaction.rawGatewayResponse
                : {}),
              webhookEvent: eventType,
              webhookProcessedAt: now.toISOString(),
            } as any,
          },
        });

        // 3. Update existing Subscription or create new active one
        const existingSub = await tx.subscription.findFirst({
          where: { tenantId, gatewayOrderId: transaction.orderId },
          orderBy: { createdAt: 'desc' },
        });

        let subId = existingSub?.id;
        if (existingSub) {
          const updatedSub = await tx.subscription.update({
            where: { id: existingSub.id },
            data: {
              status: 'ACTIVE',
              startsAt: now,
              endsAt,
              gatewayPaymentId: paymentId || existingSub.gatewayPaymentId,
              metadata: {
                ...(typeof existingSub.metadata === 'object' && existingSub.metadata !== null
                  ? existingSub.metadata
                  : {}),
                activatedByWebhook: true,
                webhookEventId: eventId,
                activatedAt: now.toISOString(),
              },
            },
          });
          subId = updatedSub.id;
        } else {
          const newSub = await tx.subscription.create({
            data: {
              tenantId,
              plan: transaction.plan,
              billingCycle: transaction.billingCycle,
              status: 'ACTIVE',
              amount: transaction.amount,
              currency: 'INR',
              startsAt: now,
              endsAt,
              gatewayOrderId: transaction.orderId,
              gatewayPaymentId: paymentId,
              metadata: {
                activatedByWebhook: true,
                webhookEventId: eventId,
                activatedAt: now.toISOString(),
              },
            },
          });
          subId = newSub.id;
        }

        // 4. Activate Tenant
        await tx.tenant.update({
          where: { id: tenantId },
          data: {
            status: 'ACTIVE',
          },
        });

        // 5. Update Tenant Policy subscription dates and 5 technician quota
        await tx.tenantPolicy.upsert({
          where: { tenantId },
          create: {
            tenantId,
            subscriptionStartsAt: now,
            subscriptionEndsAt: endsAt,
            maxUsersQuota: planLimits.maxTechnicians,
          },
          update: {
            subscriptionStartsAt: now,
            subscriptionEndsAt: endsAt,
            maxUsersQuota: planLimits.maxTechnicians,
          },
        });

        // 6. Create immutable Audit Event
        await tx.auditEvent.create({
          data: {
            tenantId,
            actorId: transaction.userId || null,
            eventType: 'WEBHOOK_PAYMENT_CAPTURED',
            resourceType: 'Subscription',
            resourceId: subId,
            action: 'WEBHOOK_CAPTURE',
            metadata: {
              eventId,
              eventType,
              orderId: transaction.orderId,
              paymentId,
              plan: transaction.plan,
              billingCycle: transaction.billingCycle,
              amount: transaction.amount.toString(),
            },
          },
        });
      });

      logger.info(
        { tenantId, orderId, paymentId, eventId },
        '[Webhook] Subscription successfully activated via webhook'
      );

      return {
        status: 'success',
        eventId,
        message: 'Payment captured and subscription activated successfully',
      };
    } else if (eventType === 'payment.failed') {
      const errorDesc =
        paymentEntity?.error_description ||
        paymentEntity?.error_reason ||
        'Payment was failed or cancelled by customer';

      const transaction = await this.prisma.paymentTransaction.findFirst({
        where: {
          OR: [
            ...(orderId ? [{ orderId }] : []),
            ...(paymentId ? [{ paymentId }] : []),
          ],
        },
      });

      await this.prisma.$transaction(async (tx) => {
        // 1. Record Webhook Event for idempotency
        await tx.webhookEvent.create({
          data: {
            eventId,
            event: eventType,
            status: 'PROCESSED',
            payload: payload as any,
          },
        });

        // 2. Mark Transaction as FAILED
        if (transaction) {
          await tx.paymentTransaction.update({
            where: { id: transaction.id },
            data: {
              status: 'FAILED',
              errorMessage: errorDesc,
              rawGatewayResponse: {
                ...(typeof transaction.rawGatewayResponse === 'object' && transaction.rawGatewayResponse !== null
                  ? transaction.rawGatewayResponse
                  : {}),
                failureReason: errorDesc,
                webhookFailedAt: new Date().toISOString(),
              } as any,
            },
          });

          // 3. Mark Subscription as FAILED (or leave PENDING_PAYMENT, Tenant must NOT be activated)
          await tx.subscription.updateMany({
            where: { tenantId: transaction.tenantId, gatewayOrderId: transaction.orderId },
            data: {
              status: 'FAILED',
            },
          });

          // 4. Create immutable Audit Event
          await tx.auditEvent.create({
            data: {
              tenantId: transaction.tenantId,
              actorId: transaction.userId || null,
              eventType: 'WEBHOOK_PAYMENT_FAILED',
              resourceType: 'PaymentTransaction',
              resourceId: transaction.id,
              action: 'WEBHOOK_PAYMENT_FAILED',
              metadata: {
                eventId,
                orderId: transaction.orderId,
                paymentId,
                errorMessage: errorDesc,
              },
            },
          });
        }
      });

      logger.warn(
        { orderId, paymentId, eventId, errorDesc },
        '[Webhook] Payment failed webhook handled safely'
      );

      return {
        status: 'success',
        eventId,
        message: 'Payment failure recorded',
      };
    } else {
      // Store any other unhandled event for logging/audit purposes
      await this.prisma.webhookEvent.create({
        data: {
          eventId,
          event: eventType,
          status: 'IGNORED',
          payload: payload as any,
        },
      });

      return {
        status: 'ignored_unhandled_event',
        eventId,
        event: eventType,
      };
    }
  }

  /**
   * 4. Fetch current active subscription, limits, history, and expiry alerts for tenant
   */
  async getCurrentSubscription(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        policy: true,
      },
    });

    const now = new Date();

    // Latest active subscription
    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
    });

    // Check expiry
    const isSubscriptionActive = !!activeSubscription && new Date(activeSubscription.endsAt) > now;
    const isExpired = !!activeSubscription && new Date(activeSubscription.endsAt) <= now;

    // Calculate days remaining
    const daysRemaining = (activeSubscription && new Date(activeSubscription.endsAt) > now)
      ? Math.max(0, Math.ceil((new Date(activeSubscription.endsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    const currentPlanTier = activeSubscription?.plan || 'STARTER';
    const planPricing = PLAN_PRICING[currentPlanTier] || PLAN_PRICING.STARTER;

    // Status string
    let planStatus: 'ACTIVE' | 'EXPIRED' | 'TRIAL' | 'PENDING_PAYMENT' = 'TRIAL';
    if (isSubscriptionActive) {
      planStatus = 'ACTIVE';
    } else if (isExpired) {
      planStatus = 'EXPIRED';
    } else if (activeSubscription?.status === 'PENDING_PAYMENT') {
      planStatus = 'PENDING_PAYMENT';
    }

    // Expiry notification alert logic
    let alertLevel: 'EXPIRED' | 'CRITICAL_1_DAY' | 'WARNING_3_DAYS' | 'NOTICE_7_DAYS' | 'PAYMENT_FAILED' | 'NONE' = 'NONE';
    let alertMessage = '';

    if (isExpired) {
      alertLevel = 'EXPIRED';
      alertMessage = 'Your subscription has expired. Operational actions are restricted to read-only mode. All company data is safely preserved. Please renew your subscription to restore full access.';
    } else if (isSubscriptionActive) {
      if (daysRemaining <= 1) {
        alertLevel = 'CRITICAL_1_DAY';
        alertMessage = 'Urgent: Only 1 day remaining on your subscription! Renew today to prevent service interruption.';
      } else if (daysRemaining <= 3) {
        alertLevel = 'WARNING_3_DAYS';
        alertMessage = `Warning: ${daysRemaining} days remaining on your subscription. Renew now to maintain uninterrupted access.`;
      } else if (daysRemaining <= 7) {
        alertLevel = 'NOTICE_7_DAYS';
        alertMessage = `Notice: ${daysRemaining} days remaining on your current subscription plan.`;
      }
    }

    // Fetch Usage Metrics in parallel
    const [employeesCount, departmentsCount, ticketsCount, transactions, allSubscriptions] = await Promise.all([
      this.prisma.tenantMembership.count({
        where: { tenantId, user: { isActive: true } },
      }),
      this.prisma.department.count({
        where: { tenantId, isActive: true },
      }),
      this.prisma.serviceTicket.count({
        where: { tenantId, deletedAt: null },
      }),
      this.prisma.paymentTransaction.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      this.prisma.subscription.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    // Check if recent transaction failed
    const latestPaymentFailed = transactions.length > 0 && transactions[0]?.status === 'FAILED';
    if (latestPaymentFailed && alertLevel === 'NONE') {
      alertLevel = 'PAYMENT_FAILED';
      alertMessage = 'Your recent payment attempt could not be processed. Please retry or update your payment details.';
    }

    // Plan Limits
    const allowedEmployees = tenant?.policy?.maxUsersQuota || planPricing.maxTechnicians || 5;
    const allowedDepartments = currentPlanTier === 'ENTERPRISE' ? 100 : currentPlanTier === 'PROFESSIONAL' ? 20 : 5;
    const allowedTickets = currentPlanTier === 'ENTERPRISE' ? 100000 : currentPlanTier === 'PROFESSIONAL' ? 2000 : 200;
    const allowedStorageMB = currentPlanTier === 'ENTERPRISE' ? 500000 : currentPlanTier === 'PROFESSIONAL' ? 50000 : 5000;
    
    // Estimated storage based on activity
    const estimatedStorageMB = Math.min(allowedStorageMB, Math.round(120 + ticketsCount * 0.5));

    const empPercent = Math.min(100, Math.round((employeesCount / allowedEmployees) * 100));
    const deptPercent = Math.min(100, Math.round((departmentsCount / allowedDepartments) * 100));
    const ticketPercent = Math.min(100, Math.round((ticketsCount / allowedTickets) * 100));
    const storagePercent = Math.min(100, Math.round((estimatedStorageMB / allowedStorageMB) * 100));

    // Current plan object
    const currentPrice = activeSubscription
      ? Number(activeSubscription.amount)
      : planPricing.annualTotalPrice;
    const taxAmount = activeSubscription
      ? Number(activeSubscription.taxAmount)
      : Math.round((currentPrice * 0.18) / 1.18);
    const basePrice = currentPrice - taxAmount;

    // Available plans for comparison & upgrades
    const availablePlans = Object.values(PLAN_PRICING).map((p) => ({
      plan: p.plan,
      planName: `${p.plan.charAt(0) + p.plan.slice(1).toLowerCase()} Plan`,
      monthlyPrice: p.monthlyPrice,
      annualMonthlyPrice: p.annualMonthlyPrice,
      annualTotalPrice: p.annualTotalPrice,
      discountPercent: p.discountPercent,
      maxTechnicians: p.maxTechnicians,
      features: p.features,
      isCurrent: p.plan === currentPlanTier,
    }));

    // Renewal pricing
    const renewalBaseAnnual = planPricing.annualTotalPrice;
    const renewalGstAnnual = Math.round(renewalBaseAnnual * GST_RATE);
    const renewalTotalAnnual = renewalBaseAnnual + renewalGstAnnual;

    const renewalBaseMonthly = planPricing.monthlyPrice;
    const renewalGstMonthly = Math.round(renewalBaseMonthly * GST_RATE);
    const renewalTotalMonthly = renewalBaseMonthly + renewalGstMonthly;

    // Billing history (all transactions)
    const billingHistory = transactions.map((tx) => {
      const year = new Date(tx.createdAt).getFullYear();
      const seq = tx.id.replace(/-/g, '').slice(-4).toUpperCase();
      return {
        id: tx.id,
        invoiceNumber: `INV-${year}-${seq}`,
        orderId: tx.orderId,
        paymentId: tx.paymentId,
        amount: Number(tx.amount),
        currency: tx.currency,
        plan: tx.plan,
        billingCycle: tx.billingCycle,
        paymentStatus: tx.status,
        paymentMethod: tx.paymentMethod || 'Razorpay Online',
        paymentDate: tx.createdAt.toISOString(),
      };
    });

    // Subscription history
    const subscriptionHistory = allSubscriptions.map((s, idx) => {
      let type: 'NEW_PURCHASE' | 'RENEWAL' | 'UPGRADE' = 'NEW_PURCHASE';
      if (idx < allSubscriptions.length - 1) {
        const nextOlder = allSubscriptions[idx + 1];
        if (nextOlder && nextOlder.plan !== s.plan) {
          type = 'UPGRADE';
        } else {
          type = 'RENEWAL';
        }
      }
      return {
        id: s.id,
        plan: s.plan,
        planName: `${s.plan.charAt(0) + s.plan.slice(1).toLowerCase()} Plan`,
        billingCycle: s.billingCycle,
        status: s.status,
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
        amount: Number(s.amount),
        currency: s.currency,
        createdAt: s.createdAt.toISOString(),
        type,
      };
    });

    return {
      hasActiveSubscription: isSubscriptionActive,
      isExpired,
      tenantStatus: tenant?.status || 'TRIAL',
      currentPlan: {
        plan: currentPlanTier,
        planName: `${currentPlanTier.charAt(0) + currentPlanTier.slice(1).toLowerCase()} Plan`,
        status: planStatus,
        isActive: isSubscriptionActive,
        isExpired,
        startsAt: activeSubscription?.startsAt.toISOString() || null,
        endsAt: activeSubscription?.endsAt.toISOString() || null,
        daysRemaining,
        billingCycle: activeSubscription?.billingCycle || 'ANNUAL',
        currentPrice,
        basePrice,
        taxAmount,
        currency: activeSubscription?.currency || 'INR',
      },
      renewalInfo: {
        plan: currentPlanTier,
        annual: {
          basePrice: renewalBaseAnnual,
          gstAmount: renewalGstAnnual,
          totalAmount: renewalTotalAnnual,
        },
        monthly: {
          basePrice: renewalBaseMonthly,
          gstAmount: renewalGstMonthly,
          totalAmount: renewalTotalMonthly,
        },
      },
      availablePlans,
      usageAndLimits: {
        employees: {
          used: employeesCount,
          allowed: allowedEmployees,
          percentage: empPercent,
          isApproachingLimit: empPercent >= 80,
          isLimitReached: employeesCount >= allowedEmployees,
        },
        departments: {
          used: departmentsCount,
          allowed: allowedDepartments,
          percentage: deptPercent,
          isApproachingLimit: deptPercent >= 80,
          isLimitReached: departmentsCount >= allowedDepartments,
        },
        tickets: {
          used: ticketsCount,
          allowed: allowedTickets,
          percentage: ticketPercent,
          isApproachingLimit: ticketPercent >= 80,
          isLimitReached: ticketsCount >= allowedTickets,
        },
        storage: {
          usedMB: estimatedStorageMB,
          allowedMB: allowedStorageMB,
          percentage: storagePercent,
          isApproachingLimit: storagePercent >= 80,
          isLimitReached: estimatedStorageMB >= allowedStorageMB,
        },
      },
      billingHistory,
      subscriptionHistory,
      expiryNotification: {
        alertLevel,
        alertMessage,
        daysRemaining,
        isExpired,
        latestPaymentFailed,
      },
      policy: tenant?.policy
        ? {
            maxUsersQuota: tenant.policy.maxUsersQuota,
            platformAccess: tenant.policy.platformAccess,
            allowCustomerToRaise: tenant.policy.allowCustomerToRaise,
          }
        : null,
      invoices: billingHistory.filter((b) => b.paymentStatus === 'CAPTURED'),
    };
  }

  /**
   * 5. Generate and retrieve official GST Tax Invoice payload
   */
  async getInvoice(tenantId: string, transactionId: string) {
    const transaction = await this.prisma.paymentTransaction.findFirst({
      where: { id: transactionId, tenantId },
      include: {
        tenant: true,
        user: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Tax Invoice transaction was not found.');
    }

    const total = Number(transaction.amount);
    const base = Math.round(total / (1 + GST_RATE));
    const gst = total - base;
    const cgst = Math.round(gst / 2);
    const sgst = gst - cgst;

    const year = new Date(transaction.createdAt).getFullYear();
    const seq = transaction.id.replace(/-/g, '').slice(-4).toUpperCase();
    const invoiceNumber = `INV-${year}-${seq}`;

    return {
      invoiceNumber,
      orderId: transaction.orderId,
      paymentId: transaction.paymentId,
      paymentDate: transaction.createdAt.toISOString(),
      paymentStatus: transaction.status,
      plan: transaction.plan,
      planName: `${transaction.plan.charAt(0) + transaction.plan.slice(1).toLowerCase()} Plan`,
      billingCycle: transaction.billingCycle,
      currency: transaction.currency,
      baseAmount: base,
      gstAmount: gst,
      cgstAmount: cgst,
      sgstAmount: sgst,
      totalAmount: total,
      sacCode: '998313', // IT & Software SaaS consulting / subscription services
      seller: {
        companyName: 'Kalpak Solutions Inc.',
        gstin: '27AABCK1234F1Z5',
        address: 'Kalpak Tech Park, Baner-Pashan Link Road, Pune, Maharashtra 411045',
        supportEmail: 'billing@kalpak.com',
        website: 'https://kalpak.com',
      },
      buyer: {
        companyName: transaction.tenant.name,
        slug: transaction.tenant.slug,
        contactName: transaction.user?.fullName || 'Client Administrator',
        contactEmail: transaction.user?.email || '',
        gstin: (transaction.rawGatewayResponse as any)?.gstin || 'Unregistered Business',
        address: (transaction.rawGatewayResponse as any)?.billingAddress || null,
      },
    };
  }
}
