import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import crypto from 'crypto';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { PrismaService } from '../src/core/database/prisma.service';

const TEST_KEY_ID = 'rzp_test_realKeyId1234';
const TEST_KEY_SECRET = 'secret_realKeySecret9876';

// Mock Razorpay SDK class
const mockOrdersCreate = jest.fn();
jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => {
    return {
      orders: {
        create: mockOrdersCreate,
      },
    };
  });
});

describe('PaymentsService - Real Razorpay Production Integration', () => {
  let service: PaymentsService;
  let prismaMock: any;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RAZORPAY_KEY_ID = TEST_KEY_ID;
    process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;

    prismaMock = {
      tenant: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      paymentTransaction: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      subscription: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      tenantPolicy: {
        upsert: jest.fn(),
      },
      auditEvent: {
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(prismaMock);
      }),
    };

    service = new PaymentsService(prismaMock as unknown as PrismaService);
  });

  const validTenant = {
    id: 'tenant-100',
    slug: 'acme-corp',
    name: 'Acme Corp',
    policy: { notificationChannels: '9876543210' },
    memberships: [
      {
        userId: 'admin-user-1',
        role: { name: 'CLIENT_ADMIN' },
      },
    ],
  };

  const validUser = {
    id: 'admin-user-1',
    email: 'admin@acme.com',
    fullName: 'Acme Admin',
    phoneNumber: '9876543210',
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Create Razorpay order
  // ───────────────────────────────────────────────────────────────────────────
  it('1. should create a real Razorpay order with server-calculated amount + GST and store pending records', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(validTenant);
    prismaMock.user.findUnique.mockResolvedValue(validUser);

    mockOrdersCreate.mockResolvedValue({
      id: 'order_test_rzp_99999',
      amount: 353882, // (2999 * 1.18 = 3538.82) -> 3539 * 100 paise
      currency: 'INR',
      status: 'created',
    });

    const result = await service.createOrder('admin-user-1', 'tenant-100', {
      plan: 'STARTER',
      billingCycle: 'MONTHLY',
      agreedToTerms: true,
    });

    expect(mockOrdersCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        currency: 'INR',
        amount: (2999 + Math.round(2999 * 0.18)) * 100,
        notes: expect.objectContaining({
          tenantId: 'tenant-100',
          plan: 'STARTER',
        }),
      })
    );

    expect(prismaMock.paymentTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant-100',
          orderId: 'order_test_rzp_99999',
          status: 'CREATED',
        }),
      })
    );

    expect(result.orderId).toBe('order_test_rzp_99999');
    expect(result.keyId).toBe(TEST_KEY_ID);
    expect(result.amount).toBe((2999 + Math.round(2999 * 0.18)) * 100);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Invalid plan
  // ───────────────────────────────────────────────────────────────────────────
  it('2. should reject order creation if the plan is invalid', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(validTenant);

    await expect(
      service.createOrder('admin-user-1', 'tenant-100', {
        plan: 'UNKNOWN_PLAN' as any,
        billingCycle: 'MONTHLY',
        agreedToTerms: true,
      })
    ).rejects.toThrow(BadRequestException);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Invalid tenant
  // ───────────────────────────────────────────────────────────────────────────
  it('3. should reject order creation if tenant does not exist', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(null);

    await expect(
      service.createOrder('admin-user-1', 'non-existent-tenant', {
        plan: 'STARTER',
        billingCycle: 'MONTHLY',
        agreedToTerms: true,
      })
    ).rejects.toThrow(NotFoundException);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Razorpay verification success
  // ───────────────────────────────────────────────────────────────────────────
  it('4. should verify valid Razorpay cryptographic signature and activate subscription', async () => {
    const orderId = 'order_test_rzp_valid';
    const paymentId = 'pay_test_real_777';

    // Calculate genuine HMAC SHA-256 using test key secret
    const validSignature = crypto
      .createHmac('sha256', TEST_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    prismaMock.paymentTransaction.findUnique.mockResolvedValue({
      id: 'tx-100',
      tenantId: 'tenant-100',
      orderId,
      status: 'PENDING',
      plan: 'STARTER',
      billingCycle: 'MONTHLY',
      amount: 3539,
      createdAt: new Date(),
    });

    prismaMock.paymentTransaction.update.mockResolvedValue({
      id: 'tx-100',
      status: 'CAPTURED',
      paymentId,
    });

    prismaMock.subscription.findFirst.mockResolvedValue(null);
    prismaMock.subscription.create.mockResolvedValue({
      id: 'sub-new-1',
      status: 'ACTIVE',
      plan: 'STARTER',
      billingCycle: 'MONTHLY',
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 30 * 86400000),
    });

    const verifyResult = await service.verifyPayment('admin-user-1', 'tenant-100', {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: validSignature,
    });

    expect(verifyResult.success).toBe(true);
    expect(verifyResult.status).toBe('ACTIVE');
    expect(prismaMock.paymentTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tx-100' },
        data: expect.objectContaining({
          status: 'CAPTURED',
          paymentId,
          signature: validSignature,
        }),
      })
    );
    expect(prismaMock.subscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'ACTIVE',
          tenantId: 'tenant-100',
          plan: 'STARTER',
        }),
      })
    );
    expect(prismaMock.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tenant-100' },
        data: expect.objectContaining({
          status: 'ACTIVE',
        }),
      })
    );
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Razorpay verification failure
  // ───────────────────────────────────────────────────────────────────────────
  it('5. should reject invalid signature, record transaction failure, and NEVER activate subscription', async () => {
    const orderId = 'order_test_rzp_valid';
    const paymentId = 'pay_test_real_777';
    const forgedSignature = 'forged_fake_signature_abc123';

    prismaMock.paymentTransaction.findUnique.mockResolvedValue({
      id: 'tx-100',
      tenantId: 'tenant-100',
      orderId,
      status: 'PENDING',
      plan: 'STARTER',
      billingCycle: 'MONTHLY',
    });

    await expect(
      service.verifyPayment('admin-user-1', 'tenant-100', {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: forgedSignature,
      })
    ).rejects.toThrow(BadRequestException);

    // Verify transaction status was set to FAILED
    expect(prismaMock.paymentTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tx-100' },
        data: expect.objectContaining({
          status: 'FAILED',
        }),
      })
    );

    // Verify subscription was NOT created or activated
    expect(prismaMock.subscription.create).not.toHaveBeenCalled();
    expect(prismaMock.tenant.update).not.toHaveBeenCalled();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Duplicate verification / Idempotency
  // ───────────────────────────────────────────────────────────────────────────
  it('6. should handle duplicate verification idempotently without double-activating or charging', async () => {
    const orderId = 'order_test_rzp_duplicate';
    const paymentId = 'pay_test_real_888';
    const validSignature = crypto
      .createHmac('sha256', TEST_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    prismaMock.paymentTransaction.findUnique.mockResolvedValue({
      id: 'tx-already-captured',
      tenantId: 'tenant-100',
      orderId,
      status: 'CAPTURED',
      paymentId,
      plan: 'STARTER',
      billingCycle: 'MONTHLY',
      createdAt: new Date(),
    });

    prismaMock.subscription.findFirst.mockResolvedValue({
      id: 'sub-existing-active',
      status: 'ACTIVE',
      plan: 'STARTER',
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 30 * 86400000),
    });

    const res = await service.verifyPayment('admin-user-1', 'tenant-100', {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: validSignature,
    });

    expect(res.success).toBe(true);
    expect(res.message).toContain('already been verified');
    expect(prismaMock.paymentTransaction.update).not.toHaveBeenCalled();
    expect(prismaMock.subscription.create).not.toHaveBeenCalled();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. Unauthorized tenant access
  // ───────────────────────────────────────────────────────────────────────────
  it('7. should reject verification if an order belongs to another tenant', async () => {
    const orderId = 'order_test_rzp_other_tenant';

    prismaMock.paymentTransaction.findUnique.mockResolvedValue({
      id: 'tx-other',
      tenantId: 'different-tenant-999', // Belongs to someone else
      orderId,
      status: 'PENDING',
    });

    await expect(
      service.verifyPayment('attacker-user', 'tenant-100', {
        razorpay_order_id: orderId,
        razorpay_payment_id: 'pay_123',
        razorpay_signature: 'any_sig',
      })
    ).rejects.toThrow(NotFoundException);
  });

  it('7b. should reject order creation if user is not a Client Admin of the tenant', async () => {
    const nonAdminTenant = {
      ...validTenant,
      memberships: [
        {
          userId: 'regular-user-2',
          role: { name: 'TECHNICIAN' },
        },
      ],
    };
    prismaMock.tenant.findUnique.mockResolvedValue(nonAdminTenant);

    await expect(
      service.createOrder('regular-user-2', 'tenant-100', {
        plan: 'STARTER',
        billingCycle: 'MONTHLY',
        agreedToTerms: true,
      })
    ).rejects.toThrow(ForbiddenException);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 8. Payment failure / cancellation
  // ───────────────────────────────────────────────────────────────────────────
  it('8. should record explicit payment cancellation/failure', async () => {
    prismaMock.paymentTransaction.findUnique.mockResolvedValue({
      id: 'tx-cancel-1',
      tenantId: 'tenant-100',
      orderId: 'order_test_cancelled',
      status: 'PENDING',
    });

    await service.recordPaymentFailure('tenant-100', {
      orderId: 'order_test_cancelled',
      reason: 'User cancelled payment modal on Razorpay checkout',
    });

    expect(prismaMock.paymentTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tx-cancel-1' },
        data: expect.objectContaining({
          status: 'FAILED',
          errorMessage: 'User cancelled payment modal on Razorpay checkout',
        }),
      })
    );
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 9. Subscription is activated ONLY after successful verification
  // ───────────────────────────────────────────────────────────────────────────
  it('9. should ensure pending order does NOT activate subscription before verification', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(validTenant);
    prismaMock.user.findUnique.mockResolvedValue(validUser);
    mockOrdersCreate.mockResolvedValue({
      id: 'order_unverified_1',
      amount: 10000,
      currency: 'INR',
    });

    // Step A: Create order
    await service.createOrder('admin-user-1', 'tenant-100', {
      plan: 'STARTER',
      billingCycle: 'MONTHLY',
      agreedToTerms: true,
    });

    // Subscription status created in createOrder must be PENDING_PAYMENT, NOT ACTIVE
    expect(prismaMock.subscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PENDING_PAYMENT',
        }),
      })
    );
    // Tenant plan/status is NOT updated to ACTIVE during createOrder
    expect(prismaMock.tenant.update).not.toHaveBeenCalled();
  });
});
