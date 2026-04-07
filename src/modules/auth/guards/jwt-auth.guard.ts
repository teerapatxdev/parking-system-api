import { ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { EntityManager } from 'typeorm';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { User } from '../../../database/entities/user.entity';
import type { AuthenticatedUser } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private config: ConfigService,
    private manager: EntityManager,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = request.headers.authorization?.split(' ')[1];
    const mode = this.config.get<string>('MODE');

    if (mode === 'DEV' && token?.startsWith('email:')) {
      return this.bypassTokenDevMode(request, token.replace('email:', ''));
    }

    return (await super.canActivate(context)) as boolean;
  }

  private async bypassTokenDevMode(request: Request, email: string): Promise<boolean> {
    const user = await this.manager.getRepository(User).findOneBy({ email });
    if (!user) {
      throw new UnauthorizedException(`Bypass failed: user with email "${email}" not found.`);
    }

    const authenticatedUser: AuthenticatedUser = {
      userId: user.userId,
      userFullName: user.userFullName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      role: user.userRole,
    };

    (request as Request & { user: AuthenticatedUser }).user = authenticatedUser;
    this.logger.warn(`[DEV BYPASS] Authenticated as ${email} (${user.userRole})`);
    return true;
  }
}
