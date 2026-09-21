import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { NotificationListQueryDto, TestNotificationDispatchDto } from './dto/notification.dto';
import { CurrentUser } from '../../core/auth/current-user.decorator';
import { CurrentTenant } from '../../core/tenant/current-tenant.decorator';
import { UserPrincipal, TenantContext } from '@kalpak/types';
import { TenantGuard } from '../../core/tenant/tenant.guard';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(TenantGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/v1/notifications — List notifications for current user
  // ─────────────────────────────────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'List notifications for the logged-in user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  async listUserNotifications(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Query() query: NotificationListQueryDto,
  ) {
    return this.notificationsService.getUserNotifications(tenantCtx.tenantId, user.id, query);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/v1/notifications/unread-count — Fast unread count for bell badge
  // ─────────────────────────────────────────────────────────────────────────
  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count for the current user' })
  async getUnreadCount(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
  ) {
    return this.notificationsService.getUnreadCount(tenantCtx.tenantId, user.id);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PATCH /api/v1/notifications/:id/read — Mark single notification as read
  // ─────────────────────────────────────────────────────────────────────────
  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(tenantCtx.tenantId, user.id, id);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/v1/notifications/mark-all-read — Mark all notifications as read
  // ─────────────────────────────────────────────────────────────────────────
  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read for the current user' })
  async markAllAsRead(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
  ) {
    return this.notificationsService.markAllAsRead(tenantCtx.tenantId, user.id);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/v1/notifications/test-dispatch — Test dispatch simulator
  // ─────────────────────────────────────────────────────────────────────────
  @Post('test-dispatch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dispatch a test notification across supported channels' })
  async testDispatch(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Body() dto: TestNotificationDispatchDto,
  ) {
    return this.notificationsService.testDispatch(tenantCtx.tenantId, user.id, dto);
  }
}
