import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { DatabaseModule } from './core/database/database.module';
import { TenantModule } from './core/tenant/tenant.module';
import { SessionAuthGuard } from './core/auth/session-auth.guard';
import { TenantInterceptor } from './core/tenant/tenant.interceptor';
import { CorrelationIdInterceptor } from './core/interceptors/correlation-id.interceptor';
import { LoggingInterceptor } from './core/interceptors/logging.interceptor';
import { TransformResponseInterceptor } from './core/interceptors/transform-response.interceptor';
import { GlobalExceptionFilter } from './core/filters/global-exception.filter';
import { MailModule } from './core/mail/mail.module';
import { HealthModule } from './modules/health/health.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ProductsModule } from './modules/products/products.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { WorkOrdersModule } from './modules/work-orders/work-orders.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PortalModule } from './modules/portal/portal.module';
import { ContractsModule } from './modules/contracts/contracts.module';

@Module({
  imports: [
    DatabaseModule,
    TenantModule,
    MailModule,
    AuditModule,
    HealthModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    DepartmentsModule,
    CustomersModule,
    ProductsModule,
    EmployeesModule,
    TicketsModule,
    NotificationsModule,
    WorkOrdersModule,
    InventoryModule,
    PortalModule,
    ContractsModule,
  ],
  providers: [
    // 1. Global Exception Filter (standardizes all API error responses)
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    // 2. Correlation ID Interceptor (sets x-correlation-id first)
    {
      provide: APP_INTERCEPTOR,
      useClass: CorrelationIdInterceptor,
    },
    // 3. Structured Logging Interceptor (logs duration and status)
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // 4. Global Authentication Guard (enforces session authentication unless @Public())
    {
      provide: APP_GUARD,
      useClass: SessionAuthGuard,
    },
    // 5. Tenant Context Interceptor (binds AsyncLocalStorage and RLS context)
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
    // 6. Global Response Transformer (wraps in StandardApiResponse)
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformResponseInterceptor,
    },
  ],
})
export class AppModule {}
