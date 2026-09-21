import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../core/auth/public.decorator';
import { PrismaService } from '../../core/database/prisma.service';

@ApiTags('Health & Readiness')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liveness check probe' })
  @ApiResponse({ status: 200, description: 'Application process is alive' })
  liveness() {
    return {
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('ready')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Readiness check probe validating database connectivity' })
  @ApiResponse({ status: 200, description: 'All backing dependencies are ready' })
  async readiness() {
    let dbStatus = 'DOWN';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'UP';
    } catch {
      dbStatus = 'DOWN';
    }

    const isReady = dbStatus === 'UP';
    return {
      status: isReady ? 'READY' : 'NOT_READY',
      dependencies: {
        database: dbStatus,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
