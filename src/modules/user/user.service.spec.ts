import { Test, type TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EntityManager, Not, type Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserService } from './user.service';
import { EUserRole, type User } from '../../database/entities/user.entity';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

jest.mock('bcrypt');

describe('UserService', () => {
  let service: UserService;
  let userRepo: jest.Mocked<Pick<Repository<User>, 'findOne' | 'findOneBy' | 'create' | 'save' | 'count' | 'find'>>;

  const currentUserId = 'current-user-id';
  const bcryptHashMock = bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>;

  const buildUser = (overrides: Partial<User> = {}): User =>
    ({
      userId: 'user-id-1',
      userFullName: 'Test User',
      email: 'test@parking.co',
      passwordHash: 'hashed',
      phoneNumber: '0812345678',
      userRole: EUserRole.ADMIN,
      createdAt: new Date(),
      createdBy: null,
      updatedAt: new Date(),
      updatedBy: null,
      deletedAt: null,
      deletedBy: null,
      ...overrides,
    }) as User;

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      find: jest.fn(),
    };

    const entityManagerMock = {
      getRepository: jest.fn().mockReturnValue(userRepo),
    } as unknown as EntityManager;

    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, { provide: EntityManager, useValue: entityManagerMock }],
    }).compile();

    service = module.get<UserService>(UserService);

    bcryptHashMock.mockResolvedValue('hashed-password' as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateUserDto = {
      userFullName: 'Test User',
      email: 'test@parking.co',
      password: 'password123',
      phoneNumber: '0812345678',
      userRole: EUserRole.ADMIN,
    };

    it('should create and save a new user when no duplicates', async () => {
      const created = buildUser({ passwordHash: 'hashed-password' });
      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockReturnValue(created);
      userRepo.save.mockResolvedValue(created);

      const result = await service.create(dto, currentUserId);

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: [{ email: dto.email }, { phoneNumber: dto.phoneNumber }],
      });
      expect(bcryptHashMock).toHaveBeenCalledWith(dto.password, 10);
      expect(userRepo.create).toHaveBeenCalledWith({
        userFullName: dto.userFullName,
        email: dto.email,
        passwordHash: 'hashed-password',
        phoneNumber: dto.phoneNumber,
        userRole: dto.userRole,
        createdBy: currentUserId,
        updatedBy: currentUserId,
      });
      expect(userRepo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });

    it('should omit phoneNumber from where clause when not provided', async () => {
      const dtoNoPhone: CreateUserDto = { ...dto, phoneNumber: undefined };
      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockReturnValue(buildUser({ phoneNumber: null }));
      userRepo.save.mockResolvedValue(buildUser({ phoneNumber: null }));

      await service.create(dtoNoPhone, currentUserId);

      expect(userRepo.findOne).toHaveBeenCalledWith({ where: [{ email: dto.email }] });
      expect(userRepo.create).toHaveBeenCalledWith(expect.objectContaining({ phoneNumber: null }));
    });

    it('should throw ConflictException when email already exists', async () => {
      userRepo.findOne.mockResolvedValue(buildUser({ email: dto.email }));

      await expect(service.create(dto, currentUserId)).rejects.toThrow(new ConflictException('Email already exists.'));
      expect(userRepo.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when phone number already exists', async () => {
      const existingPhone = dto.phoneNumber ?? '';
      userRepo.findOne.mockResolvedValue(buildUser({ email: 'other@parking.co', phoneNumber: existingPhone }));

      await expect(service.create(dto, currentUserId)).rejects.toThrow(
        new ConflictException('Phone number already exists.'),
      );
    });
  });

  describe('update', () => {
    const targetUserId = 'user-id-1';
    const superUser: AuthenticatedUser = {
      userId: 'super-id',
      userFullName: 'Super',
      email: 'super@parking.co',
      phoneNumber: null,
      role: EUserRole.SUPER,
    };
    const adminUser: AuthenticatedUser = {
      userId: targetUserId,
      userFullName: 'Admin',
      email: 'admin@parking.co',
      phoneNumber: null,
      role: EUserRole.ADMIN,
    };

    it('should throw ForbiddenException when admin tries to update another user', async () => {
      const otherAdmin: AuthenticatedUser = { ...adminUser, userId: 'other-id' };

      await expect(service.update(targetUserId, {}, otherAdmin)).rejects.toThrow(ForbiddenException);
      expect(userRepo.findOneBy).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user does not exist', async () => {
      userRepo.findOneBy.mockResolvedValue(null);

      await expect(service.update(targetUserId, {}, superUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when admin tries to change role', async () => {
      userRepo.findOneBy.mockResolvedValue(buildUser());
      const dto: UpdateUserDto = { userRole: EUserRole.SUPER };

      await expect(service.update(targetUserId, dto, adminUser)).rejects.toThrow(
        new ForbiddenException('Only SUPER users can change user roles.'),
      );
    });

    it('should throw ConflictException when demoting the last SUPER user', async () => {
      userRepo.findOneBy.mockResolvedValue(buildUser({ userRole: EUserRole.SUPER }));
      userRepo.count.mockResolvedValue(1);

      await expect(service.update(targetUserId, { userRole: EUserRole.ADMIN }, superUser)).rejects.toThrow(
        new ConflictException('Cannot demote the last SUPER user.'),
      );
    });

    it('should allow demoting SUPER user when more than one SUPER exists', async () => {
      const existing = buildUser({ userRole: EUserRole.SUPER });
      userRepo.findOneBy.mockResolvedValue(existing);
      userRepo.count.mockResolvedValue(2);
      userRepo.findOne.mockResolvedValue(null);
      userRepo.save.mockImplementation((u) => Promise.resolve(u as User));

      const result = await service.update(targetUserId, { userRole: EUserRole.ADMIN }, superUser);

      expect(result.userRole).toBe(EUserRole.ADMIN);
      expect(result.updatedBy).toBe(superUser.userId);
    });

    it('should throw ConflictException when new email already exists on another user', async () => {
      userRepo.findOneBy.mockResolvedValue(buildUser());
      userRepo.findOne.mockResolvedValue(buildUser({ userId: 'other', email: 'dup@parking.co' }));

      await expect(service.update(targetUserId, { email: 'dup@parking.co' }, superUser)).rejects.toThrow(
        new ConflictException('Email already exists.'),
      );

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: [{ email: 'dup@parking.co', userId: Not(targetUserId) }],
      });
    });

    it('should throw ConflictException when new phone number already exists on another user', async () => {
      userRepo.findOneBy.mockResolvedValue(buildUser());
      userRepo.findOne.mockResolvedValue(buildUser({ userId: 'other', email: 'x@x.co', phoneNumber: '0999999999' }));

      await expect(service.update(targetUserId, { phoneNumber: '0999999999' }, superUser)).rejects.toThrow(
        new ConflictException('Phone number already exists.'),
      );
    });

    it('should hash new password when provided', async () => {
      const existing = buildUser();
      userRepo.findOneBy.mockResolvedValue(existing);
      userRepo.save.mockImplementation((u) => Promise.resolve(u as User));

      await service.update(targetUserId, { password: 'newpassword' }, superUser);

      expect(bcryptHashMock).toHaveBeenCalledWith('newpassword', 10);
      expect(userRepo.save).toHaveBeenCalledWith(expect.objectContaining({ passwordHash: 'hashed-password' }));
    });

    it('should keep existing fields when body fields are undefined', async () => {
      const existing = buildUser({ userFullName: 'Original', email: 'orig@parking.co' });
      userRepo.findOneBy.mockResolvedValue(existing);
      userRepo.save.mockImplementation((u) => Promise.resolve(u as User));

      const result = await service.update(targetUserId, {}, superUser);

      expect(result.userFullName).toBe('Original');
      expect(result.email).toBe('orig@parking.co');
      expect(result.passwordHash).toBe(existing.passwordHash);
      expect(bcryptHashMock).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException when user does not exist', async () => {
      userRepo.findOneBy.mockResolvedValue(null);

      await expect(service.delete('user-id-1', currentUserId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when deleting the last SUPER user', async () => {
      userRepo.findOneBy.mockResolvedValue(buildUser({ userRole: EUserRole.SUPER }));
      userRepo.count.mockResolvedValue(1);

      await expect(service.delete('user-id-1', currentUserId)).rejects.toThrow(
        new ConflictException('Cannot delete the last SUPER user.'),
      );
    });

    it('should soft delete an ADMIN user', async () => {
      const existing = buildUser({ userRole: EUserRole.ADMIN });
      userRepo.findOneBy.mockResolvedValue(existing);
      userRepo.save.mockImplementation((u) => Promise.resolve(u as User));

      const result = await service.delete('user-id-1', currentUserId);

      expect(userRepo.count).not.toHaveBeenCalled();
      expect(result.deletedAt).toBeInstanceOf(Date);
      expect(result.deletedBy).toBe(currentUserId);
    });

    it('should soft delete a SUPER user when more than one SUPER exists', async () => {
      const existing = buildUser({ userRole: EUserRole.SUPER });
      userRepo.findOneBy.mockResolvedValue(existing);
      userRepo.count.mockResolvedValue(3);
      userRepo.save.mockImplementation((u) => Promise.resolve(u as User));

      const result = await service.delete('user-id-1', currentUserId);

      expect(result.deletedAt).toBeInstanceOf(Date);
      expect(result.deletedBy).toBe(currentUserId);
    });
  });

  describe('findOneById', () => {
    it('should return the user when found', async () => {
      const user = buildUser();
      userRepo.findOneBy.mockResolvedValue(user);

      await expect(service.findOneById('user-id-1')).resolves.toEqual(user);
      expect(userRepo.findOneBy).toHaveBeenCalledWith({ userId: 'user-id-1' });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      userRepo.findOneBy.mockResolvedValue(null);

      await expect(service.findOneById('user-id-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findList', () => {
    it('should return all users for SUPER role', async () => {
      const users = [buildUser()];
      userRepo.find.mockResolvedValue(users);

      const result = await service.findList(EUserRole.SUPER);

      expect(userRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
      expect(result).toEqual(users);
    });

    it('should filter ADMIN users only when role is ADMIN', async () => {
      const users = [buildUser()];
      userRepo.find.mockResolvedValue(users);

      const result = await service.findList(EUserRole.ADMIN);

      expect(userRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: { userRole: EUserRole.ADMIN } }));
      expect(result).toEqual(users);
    });
  });
});
