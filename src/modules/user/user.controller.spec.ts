import { Test, type TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { EUserRole, type User } from '../../database/entities/user.entity';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

describe('UserController', () => {
  let controller: UserController;
  const createMock = jest.fn();
  const findOneByIdMock = jest.fn();
  const findListMock = jest.fn();
  const updateMock = jest.fn();
  const deleteMock = jest.fn();

  const mockSuperUser: AuthenticatedUser = {
    userId: 'super-user-id',
    userFullName: 'Super User',
    email: 'super@parking.co',
    phoneNumber: null,
    role: EUserRole.SUPER,
  };

  const mockUser = {
    userId: 'user-id-1',
    userFullName: 'Test User',
    email: 'test@parking.co',
    phoneNumber: '0812345678',
    userRole: EUserRole.ADMIN,
  } as User;

  beforeEach(async () => {
    createMock.mockReset();
    findOneByIdMock.mockReset();
    findListMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            create: createMock,
            findOneById: findOneByIdMock,
            findList: findListMock,
            update: updateMock,
            delete: deleteMock,
          },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call userService.create with body and current user id', async () => {
      const dto: CreateUserDto = {
        userFullName: 'Test User',
        email: 'test@parking.co',
        password: 'password123',
        phoneNumber: '0812345678',
        userRole: EUserRole.ADMIN,
      };
      createMock.mockResolvedValue(mockUser);

      const result = await controller.create(dto, mockSuperUser);

      expect(createMock).toHaveBeenCalledWith(dto, mockSuperUser.userId);
      expect(result).toEqual(mockUser);
    });
  });

  describe('findOneById', () => {
    it('should call userService.findOneById with userId from param', async () => {
      findOneByIdMock.mockResolvedValue(mockUser);

      const result = await controller.findOneById({ userId: 'user-id-1' });

      expect(findOneByIdMock).toHaveBeenCalledWith('user-id-1');
      expect(result).toEqual(mockUser);
    });
  });

  describe('findList', () => {
    it('should call userService.findList with current user role', async () => {
      const list = [mockUser];
      findListMock.mockResolvedValue(list);

      const result = await controller.findList(mockSuperUser);

      expect(findListMock).toHaveBeenCalledWith(EUserRole.SUPER);
      expect(result).toEqual(list);
    });
  });

  describe('update', () => {
    it('should call userService.update with userId, body and current user', async () => {
      const dto: UpdateUserDto = { userFullName: 'New Name' };
      updateMock.mockResolvedValue(mockUser);

      const result = await controller.update({ userId: 'user-id-1' }, dto, mockSuperUser);

      expect(updateMock).toHaveBeenCalledWith('user-id-1', dto, mockSuperUser);
      expect(result).toEqual(mockUser);
    });
  });

  describe('delete', () => {
    it('should call userService.delete with userId and current user id', async () => {
      deleteMock.mockResolvedValue(mockUser);

      const result = await controller.delete({ userId: 'user-id-1' }, mockSuperUser);

      expect(deleteMock).toHaveBeenCalledWith('user-id-1', mockSuperUser.userId);
      expect(result).toEqual(mockUser);
    });
  });
});
