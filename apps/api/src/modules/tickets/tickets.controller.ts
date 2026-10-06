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
import { TicketsService } from './tickets.service';
import {
  CreateTicketDto,
  UpdateTicketStatusDto,
  AssignTicketDto,
  AddTicketNoteDto,
  UpdateTicketPriorityDto,
  TicketStatsQueryDto,
} from './dto/ticket.dto';
import { CurrentUser } from '../../core/auth/current-user.decorator';
import { CurrentTenant } from '../../core/tenant/current-tenant.decorator';
import { UserPrincipal, TenantContext, PermissionCode } from '@kalpak/types';
import { TenantGuard } from '../../core/tenant/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/permissions.guard';
import { RequirePermissions } from '../../core/rbac/require-permissions.decorator';

@ApiTags('Tickets')
@ApiBearerAuth()
@Controller('tickets')
@UseGuards(TenantGuard, PermissionsGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/v1/tickets/stats — Dashboard statistics
  // ─────────────────────────────────────────────────────────────────────────
  @Get('stats')
  @RequirePermissions(PermissionCode.TICKET_READ)
  @ApiOperation({ summary: 'Get ticket dashboard statistics for the current tenant' })
  async getStats(
    @CurrentTenant() tenantCtx: TenantContext,
    @Query() query: TicketStatsQueryDto,
  ) {
    return this.ticketsService.getStats(tenantCtx.tenantId, query);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/v1/tickets — List with full filtering and pagination
  // ─────────────────────────────────────────────────────────────────────────
  @Get()
  @RequirePermissions(PermissionCode.TICKET_READ)
  @ApiOperation({ summary: 'List tickets with filters, search, and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'AWAITING_CUSTOMER', 'RESOLVED', 'CLOSED', 'CANCELLED'] })
  @ApiQuery({ name: 'priority', required: false, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  @ApiQuery({ name: 'departmentId', required: false, type: String })
  @ApiQuery({ name: 'assignedToUserId', required: false, type: String })
  @ApiQuery({ name: 'raisedForCustomerId', required: false, type: String })
  @ApiQuery({ name: 'isOverdue', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'updatedAt', 'priority', 'status', 'ticketNumber'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async listTickets(
    @CurrentTenant() tenantCtx: TenantContext,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('departmentId') departmentId?: string,
    @Query('assignedToUserId') assignedToUserId?: string,
    @Query('raisedForCustomerId') raisedForCustomerId?: string,
    @Query('isOverdue') isOverdue?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.ticketsService.listTickets(tenantCtx.tenantId, {
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      status,
      priority,
      departmentId,
      assignedToUserId,
      raisedForCustomerId,
      isOverdue: isOverdue !== undefined ? isOverdue === 'true' : undefined,
      search,
      sortBy,
      sortOrder: sortOrder as 'asc' | 'desc' | undefined,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/v1/tickets — Create a new ticket
  // ─────────────────────────────────────────────────────────────────────────
  @Post()
  @RequirePermissions(PermissionCode.TICKET_CREATE)
  @ApiOperation({ summary: 'Create a new service ticket (policy-aware intake)' })
  async createTicket(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Body() dto: CreateTicketDto,
  ) {
    return this.ticketsService.createTicket(
      tenantCtx.tenantId,
      user.id,
      dto,
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/v1/tickets/:id — Single ticket with full timeline
  // ─────────────────────────────────────────────────────────────────────────
  @Get(':id')
  @RequirePermissions(PermissionCode.TICKET_READ)
  @ApiOperation({ summary: 'Get ticket detail with full timeline and assignment history' })
  async getTicket(
    @CurrentTenant() tenantCtx: TenantContext,
    @Param('id') id: string,
  ) {
    return this.ticketsService.getTicketById(tenantCtx.tenantId, id);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PATCH /api/v1/tickets/:id/status — Status state machine transition
  // ─────────────────────────────────────────────────────────────────────────
  @Patch(':id/status')
  @RequirePermissions(PermissionCode.TICKET_UPDATE)
  @ApiOperation({ summary: 'Transition ticket status (state machine enforced)' })
  async updateStatus(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.ticketsService.updateStatus(
      tenantCtx.tenantId,
      id,
      user.id,
      dto,
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PATCH /api/v1/tickets/:id/assign — Manual assignment
  // ─────────────────────────────────────────────────────────────────────────
  @Patch(':id/assign')
  @RequirePermissions(PermissionCode.TICKET_ASSIGN)
  @ApiOperation({ summary: 'Assign or re-assign ticket to a team member' })
  async assignTicket(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string,
    @Body() dto: AssignTicketDto,
  ) {
    return this.ticketsService.assignTicket(
      tenantCtx.tenantId,
      id,
      user.id,
      dto,
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/v1/tickets/:id/notes — Add a comment/note
  // ─────────────────────────────────────────────────────────────────────────
  @Post(':id/notes')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PermissionCode.TICKET_UPDATE)
  @ApiOperation({ summary: 'Add a note or comment to the ticket timeline' })
  async addNote(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string,
    @Body() dto: AddTicketNoteDto,
  ) {
    return this.ticketsService.addNote(tenantCtx.tenantId, id, user.id, dto);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PATCH /api/v1/tickets/:id/priority — Change priority
  // ─────────────────────────────────────────────────────────────────────────
  @Patch(':id/priority')
  @RequirePermissions(PermissionCode.TICKET_UPDATE)
  @ApiOperation({ summary: 'Update ticket priority with timeline entry' })
  async updatePriority(
    @CurrentTenant() tenantCtx: TenantContext,
    @CurrentUser() user: UserPrincipal,
    @Param('id') id: string,
    @Body() dto: UpdateTicketPriorityDto,
  ) {
    return this.ticketsService.updatePriority(tenantCtx.tenantId, id, user.id, dto);
  }
}
