import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService, PLAN_PRICING } from './payments.service';
import { CreatePaymentOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { CurrentUser } from '../../core/auth/current-user.decorator';
import { CurrentTenant } from '../../core/tenant/current-tenant.decorator';
import { Public } from '../../core/auth/public.decorator';

@ApiTags('Subscriptions & Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Get('pricing')
  @ApiOperation({ summary: 'Get official subscription plan pricing and feature matrix' })
  @ApiResponse({ status: 200, description: 'Plan pricing retrieved successfully' })
  getPricing() {
    return PLAN_PRICING;
  }

  @Post('create-order')
  @HttpCode(HttpStatus.CREATED)
  @ApiCookieAuth('kalpak_session')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Generate Razorpay Order for Starter/Paid Subscription',
    description:
      'Calculates verified server-side price + 18% GST and creates a secure Razorpay order.',
  })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  async createOrder(
    @CurrentUser('id') userId: any,
    @CurrentTenant('id') tenantId: any,
    @Body() dto: CreatePaymentOrderDto,
    @Req() req: Request
  ) {
    const resolvedUserId = typeof userId === 'object' && userId !== null ? userId.id : String(userId || '');
    const resolvedTenantId = typeof tenantId === 'object' && tenantId !== null ? tenantId.tenantId || tenantId.id : String(tenantId || '');
    const userIp = req.ip || req.socket.remoteAddress;
    return this.paymentsService.createOrder(resolvedUserId, resolvedTenantId, dto, userIp);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('kalpak_session')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify Razorpay Cryptographic Signature and Activate Subscription',
    description:
      'Performs HMAC SHA-256 verification of Razorpay order/payment and activates tenant subscription.',
  })
  @ApiResponse({ status: 200, description: 'Payment verified and subscription activated' })
  async verifyPayment(
    @CurrentUser('id') userId: any,
    @CurrentTenant('id') tenantId: any,
    @Body() dto: VerifyPaymentDto
  ) {
    const resolvedUserId = typeof userId === 'object' && userId !== null ? userId.id : String(userId || '');
    const resolvedTenantId = typeof tenantId === 'object' && tenantId !== null ? tenantId.tenantId || tenantId.id : String(tenantId || '');
    return this.paymentsService.verifyPayment(resolvedUserId, resolvedTenantId, dto);
  }

  @Get('current')
  @ApiCookieAuth('kalpak_session')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active subscription and policy limits for current tenant' })
  @ApiResponse({ status: 200, description: 'Current subscription details' })
  async getCurrentSubscription(@CurrentTenant('id') tenantId: any) {
    const resolvedTenantId = typeof tenantId === 'object' && tenantId !== null ? tenantId.tenantId || tenantId.id : String(tenantId || '');
    return this.paymentsService.getCurrentSubscription(resolvedTenantId);
  }

  @Get('my-subscription')
  @ApiCookieAuth('kalpak_session')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active subscription summary for current tenant' })
  @ApiResponse({ status: 200, description: 'Current subscription details' })
  async getMySubscription(@CurrentTenant('id') tenantId: any) {
    const resolvedTenantId = typeof tenantId === 'object' && tenantId !== null ? tenantId.tenantId || tenantId.id : String(tenantId || '');
    const current = await this.paymentsService.getCurrentSubscription(resolvedTenantId);
    return {
      ...current,
      subscription: current.currentPlan
        ? {
            id: current.currentPlan.plan,
            plan: current.currentPlan.plan,
            billingCycle: 'ANNUAL',
            status: current.currentPlan.status,
            endsAt: current.currentPlan.startsAt || new Date(Date.now() + 365 * 86400000).toISOString(),
          }
        : null,
    };
  }

  @Get('invoices/:id')
  @ApiCookieAuth('kalpak_session')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get official GST Tax Invoice details for downloading/printing' })
  @ApiResponse({ status: 200, description: 'Invoice details retrieved successfully' })
  async getInvoice(
    @CurrentTenant('id') tenantId: any,
    @Param('id') transactionId: string
  ) {
    const resolvedTenantId = typeof tenantId === 'object' && tenantId !== null ? tenantId.tenantId || tenantId.id : String(tenantId || '');
    return this.paymentsService.getInvoice(resolvedTenantId, transactionId);
  }
}
