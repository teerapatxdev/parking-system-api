import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { type Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { EUserRole } from '../../../database/entities/user.entity';
import type { AuthenticatedUser } from '../interfaces/jwt-payload.interface';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;

  const buildContext = (user?: AuthenticatedUser): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  const adminUser: AuthenticatedUser = {
    userId: 'user-id-1',
    userFullName: 'Admin',
    email: 'admin@parking.co',
    phoneNumber: null,
    role: EUserRole.ADMIN,
  };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow when no roles metadata is set', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(buildContext(adminUser))).toBe(true);
  });

  it('should allow when roles metadata is empty', () => {
    reflector.getAllAndOverride.mockReturnValue([]);

    expect(guard.canActivate(buildContext(adminUser))).toBe(true);
  });

  it('should throw ForbiddenException when user is missing on the request', () => {
    reflector.getAllAndOverride.mockReturnValue([EUserRole.ADMIN]);

    expect(() => guard.canActivate(buildContext(undefined))).toThrow(new ForbiddenException('Authentication required'));
  });

  it('should allow when user role matches one of the required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([EUserRole.ADMIN, EUserRole.SUPER]);

    expect(guard.canActivate(buildContext(adminUser))).toBe(true);
  });

  it('should throw ForbiddenException when user role does not match required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([EUserRole.SUPER]);

    expect(() => guard.canActivate(buildContext(adminUser))).toThrow(
      new ForbiddenException('Requires one of roles: SUPER'),
    );
  });

  it('should look up metadata on both handler and class', () => {
    reflector.getAllAndOverride.mockReturnValue([EUserRole.ADMIN]);
    const ctx = buildContext(adminUser);

    guard.canActivate(ctx);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith('roles', [ctx.getHandler(), ctx.getClass()]);
  });
});
