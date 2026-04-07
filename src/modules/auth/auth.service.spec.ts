import { Test, type TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EntityManager, type Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { EUserRole, type User } from '../../database/entities/user.entity';
import type { LoginDto } from './dto/login.dto';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: jest.Mocked<Pick<Repository<User>, 'createQueryBuilder'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync'>>;
  let queryBuilder: {
    addSelect: jest.Mock;
    where: jest.Mock;
    getOne: jest.Mock;
  };

  const bcryptCompareMock = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>;

  const buildUser = (overrides: Partial<User> = {}): User =>
    ({
      userId: 'user-id-1',
      userFullName: 'Test User',
      email: 'test@parking.co',
      passwordHash: 'hashed-password',
      phoneNumber: '0812345678',
      userRole: EUserRole.ADMIN,
      ...overrides,
    }) as User;

  beforeEach(async () => {
    queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    userRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    const entityManagerMock = {
      getRepository: jest.fn().mockReturnValue(userRepo),
    } as unknown as EntityManager;

    jwtService = {
      signAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: EntityManager, useValue: entityManagerMock },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    const dto: LoginDto = { email: 'test@parking.co', password: 'password123' };

    it('should return access token and user info on successful login', async () => {
      const user = buildUser();
      queryBuilder.getOne.mockResolvedValue(user);
      bcryptCompareMock.mockResolvedValue(true as never);
      jwtService.signAsync.mockResolvedValue('signed-jwt-token');

      const result = await service.login(dto);

      expect(userRepo.createQueryBuilder).toHaveBeenCalledWith('u');
      expect(queryBuilder.addSelect).toHaveBeenCalledWith('u.passwordHash');
      expect(queryBuilder.where).toHaveBeenCalledWith('u.email = :email', { email: dto.email });
      expect(bcryptCompareMock).toHaveBeenCalledWith(dto.password, user.passwordHash);
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: user.userId,
        userFullName: user.userFullName,
        phoneNumber: user.phoneNumber,
        email: user.email,
        role: user.userRole,
      });
      expect(result).toEqual({
        accessToken: 'signed-jwt-token',
        userId: user.userId,
        userFullName: user.userFullName,
        phoneNumber: user.phoneNumber,
        email: user.email,
        role: user.userRole,
      });
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      queryBuilder.getOne.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(new UnauthorizedException('Invalid email or password.'));
      expect(bcryptCompareMock).not.toHaveBeenCalled();
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password does not match', async () => {
      queryBuilder.getOne.mockResolvedValue(buildUser());
      bcryptCompareMock.mockResolvedValue(false as never);

      await expect(service.login(dto)).rejects.toThrow(new UnauthorizedException('Invalid email or password.'));
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });
});
