import { Global, Module } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { TenantGuard } from './tenant.guard';
import { TenantInterceptor } from './tenant.interceptor';
import { SubdomainResolverService } from './subdomain-resolver.service';

@Global()
@Module({
  providers: [TenantContextService, TenantGuard, TenantInterceptor, SubdomainResolverService],
  exports: [TenantContextService, TenantGuard, TenantInterceptor, SubdomainResolverService],
})
export class TenantModule {}

