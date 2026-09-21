import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { PrismaService } from '../database/prisma.service';
import { hashToken } from '@kalpak/auth';

export const ALLOW_UNVERIFIED_MFA_KEY = 'allowUnverifiedMfa';
import { SetMetadata } from '@nestjs/common';
export const AllowUnverifiedMfa = () => SetMetadata(ALLOW_UNVERIFIED_MFA_KEY, true);

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // 1. Extract session token: first from HttpOnly signed/raw cookie, fallback to Bearer header
    const tokenFromCookie = request.cookies?.kalpak_session;
    let tokenFromHeader: string | undefined;

    const authHeader = request.headers['authorization'];
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      tokenFromHeader = authHeader.slice(7).trim();
    }

    const rawToken = tokenFromCookie || tokenFromHeader;

    if (!rawToken) {
      throw new UnauthorizedException('Authentication required. Missing session cookie or Bearer token');
    }

    // 2. Hash token to perform lookup (tokens in DB are hashed with SHA-256 for data leak safety)
    const tokenHash = hashToken(rawToken);

    const session = await this.prisma.session.findUnique({
      where: { sessionTokenHash: tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            isActive: true,
            isSuperAdmin: true,
            mfaEnabled: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // 3. Verify session validity
    if (session.revokedAt !== null) {
      throw new UnauthorizedException('Session has been revoked');
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session has expired');
    }

    // 4. Verify user account status
    const user = session.user;
    if (!user || user.deletedAt !== null) {
      throw new UnauthorizedException('User account no longer exists');
    }

    if (!user.isActive) {
      throw new ForbiddenException('User account is currently deactivated');
    }

    // 5. MFA verification boundary check
    const allowUnverifiedMfa = this.reflector.getAllAndOverride<boolean>(ALLOW_UNVERIFIED_MFA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (user.mfaEnabled && !session.mfaVerified && !allowUnverifiedMfa) {
      throw new UnauthorizedException('Multi-Factor Authentication (MFA) challenge required');
    }

    // 6. Attach authenticated user and session to the request
    request.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      isSuperAdmin: user.isSuperAdmin,
      mfaEnabled: user.mfaEnabled,
    };
    request.session = session;

    return true;
  }
}
