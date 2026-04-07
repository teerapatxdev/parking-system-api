import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { EntityManager, type Repository } from 'typeorm';
import { JwtAuthGuard } from './jwt-auth.guard';
import { EUserRole, type User } from '../../../database/entities/user.entity';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
  let config: jest.Mocked<Pick<ConfigService, 'get'>>;
  let userRepo: jest.Mocked<Pick<Repository<User>, 'findOneBy'>>;
  let entityManager: EntityManager;
  let superCanActivateSpy: jest.SpyInstance;

  const buildUser = (overrides: Partial<User> = {}): User =>
    ({
      userId: 'user-id-1',
      userFullName: 'Test User',
      email: 'test@parking.co',
      phoneNumber: '0812345678',
      userRole: EUserRole.ADMIN,
      ...overrides,
    }) as User;

  const buildContext = (request: Record<string, unknown>): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    config = { get: jest.fn() };
    userRepo = { findOneBy: jest.fn() };
    entityManager = {
      getRepository: jest.fn().mockReturnValue(userRepo),
    } as unknown as EntityManager;

    guard = new JwtAuthGuard(reflector as unknown as Reflector, config as unknown as ConfigService, entityManager);

    superCanActivateSpy = jest
      .spyOn(AuthGuard('jwt').prototype as { canActivate: () => Promise<boolean> }, 'canActivate')
      .mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow public routes without invoking passport', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const ctx = buildContext({ headers: {} });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(superCanActivateSpy).not.toHaveBeenCalled();
    expect(config.get).not.toHaveBeenCalled();
  });

  it('should delegate to passport JWT strategy by default', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    config.get.mockReturnValue('PROD');
    const ctx = buildContext({ headers: { authorization: 'Bearer real-jwt' } });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(superCanActivateSpy).toHaveBeenCalledWith(ctx);
    expect(userRepo.findOneBy).not.toHaveBeenCalled();
  });

  it('should delegate to passport when MODE is DEV but token is not an email bypass token', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    config.get.mockReturnValue('DEV');
    const ctx = buildContext({ headers: { authorization: 'Bearer real-jwt' } });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(superCanActivateSpy).toHaveBeenCalledWith(ctx);
    expect(userRepo.findOneBy).not.toHaveBeenCalled();
  });

  it('should delegate to passport when bypass token is used outside DEV mode', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    config.get.mockReturnValue('PROD');
    const ctx = buildContext({ headers: { authorization: 'Bearer email:test@parking.co' } });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(superCanActivateSpy).toHaveBeenCalledWith(ctx);
    expect(userRepo.findOneBy).not.toHaveBeenCalled();
  });

  it('should bypass auth in DEV mode and attach user to request', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    config.get.mockReturnValue('DEV');
    const user = buildUser();
    userRepo.findOneBy.mockResolvedValue(user);

    const request: Record<string, unknown> = {
      headers: { authorization: 'Bearer email:test@parking.co' },
    };
    const ctx = buildContext(request);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(userRepo.findOneBy).toHaveBeenCalledWith({ email: 'test@parking.co' });
    expect(superCanActivateSpy).not.toHaveBeenCalled();
    expect(request.user).toEqual({
      userId: user.userId,
      userFullName: user.userFullName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      role: user.userRole,
    });
  });

  it('should throw UnauthorizedException when DEV bypass user is not found', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    config.get.mockReturnValue('DEV');
    userRepo.findOneBy.mockResolvedValue(null);

    const ctx = buildContext({ headers: { authorization: 'Bearer email:missing@parking.co' } });

    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new UnauthorizedException('Bypass failed: user with email "missing@parking.co" not found.'),
    );
    expect(superCanActivateSpy).not.toHaveBeenCalled();
  });
});
