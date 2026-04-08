import { Test, type TestingModule } from '@nestjs/testing';
import { ParkingLotController } from './parking-lot.controller';
import { ParkingLotService } from './parking-lot.service';
import { EUserRole } from '../../database/entities/user.entity';
import { ParkingSlotSize } from '../../database/entities/parking-slot.entity';
import type { ParkingLot } from '../../database/entities/parking-lot.entity';
import type { CreateParkingLotDto } from './dto/create-parking-lot.dto';
import type { UpdateParkingLotDto } from './dto/update-parking-lot.dto';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import type { IFindParkingLotDetail } from './interfaces/find-parking-lot.interface';

describe('ParkingLotController', () => {
  let controller: ParkingLotController;
  const createMock = jest.fn();
  const updateMock = jest.fn();
  const deleteMock = jest.fn();
  const findOneByIdMock = jest.fn();
  const findAllMock = jest.fn();

  const mockUser: AuthenticatedUser = {
    userId: 'user-id-1',
    userFullName: 'Test User',
    email: 'test@parking.co',
    phoneNumber: null,
    role: EUserRole.ADMIN,
  };

  const mockParkingLot = {
    parkingLotId: 'parking-lot-id-1',
    parkingLotName: 'Parking A',
    totalSlots: 10,
  } as ParkingLot;

  beforeEach(async () => {
    createMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();
    findOneByIdMock.mockReset();
    findAllMock.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParkingLotController],
      providers: [
        {
          provide: ParkingLotService,
          useValue: {
            create: createMock,
            update: updateMock,
            delete: deleteMock,
            findOneById: findOneByIdMock,
            findAll: findAllMock,
          },
        },
      ],
    }).compile();

    controller = module.get<ParkingLotController>(ParkingLotController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call parkingLotService.create with body and current user id', async () => {
      const dto: CreateParkingLotDto = {
        parkingLotName: 'Parking A',
        slots: [{ from: 1, to: 10, size: ParkingSlotSize.SMALL }],
      };
      createMock.mockResolvedValue(mockParkingLot);

      const result = await controller.create(dto, mockUser);

      expect(createMock).toHaveBeenCalledWith(dto, mockUser.userId);
      expect(result).toEqual(mockParkingLot);
    });
  });

  describe('update', () => {
    it('should call parkingLotService.update with parkingLotId, body and current user id', async () => {
      const dto: UpdateParkingLotDto = { parkingLotName: 'New Name' };
      updateMock.mockResolvedValue(mockParkingLot);

      const result = await controller.update({ parkingLotId: 'parking-lot-id-1' }, dto, mockUser);

      expect(updateMock).toHaveBeenCalledWith('parking-lot-id-1', dto, mockUser.userId);
      expect(result).toEqual(mockParkingLot);
    });
  });

  describe('delete', () => {
    it('should call parkingLotService.delete with parkingLotId and current user id', async () => {
      deleteMock.mockResolvedValue(mockParkingLot);

      const result = await controller.delete({ parkingLotId: 'parking-lot-id-1' }, mockUser);

      expect(deleteMock).toHaveBeenCalledWith('parking-lot-id-1', mockUser.userId);
      expect(result).toEqual(mockParkingLot);
    });
  });

  describe('findList', () => {
    it('should call parkingLotService.findAll with the provided filters', async () => {
      const paginated = {
        items: [
          {
            parkingLotId: 'parking-lot-id-1',
            parkingLotName: 'Parking A',
            totalSlots: 10,
            totalAvailableSlots: { small: 3, medium: 4, large: 2 },
          },
        ],
        meta: { totalItems: 1, itemCount: 1, itemsPerPage: 10, totalPages: 1, currentPage: 1 },
      };
      findAllMock.mockResolvedValue(paginated);

      const filters = { parkingLotName: 'Park', page: 1, limit: 10 };
      const result = await controller.findList(filters);

      expect(findAllMock).toHaveBeenCalledWith(filters);
      expect(result).toEqual(paginated);
    });
  });

  describe('findOneById', () => {
    it('should call parkingLotService.findOneById with parkingLotId from param', async () => {
      const detail: IFindParkingLotDetail = {
        parkingLotName: 'Parking A',
        totalSlots: 10,
        totalAvailableSlots: { small: 3, medium: 4, large: 2 },
      };
      findOneByIdMock.mockResolvedValue(detail);

      const result = await controller.findOneById({ parkingLotId: 'parking-lot-id-1' });

      expect(findOneByIdMock).toHaveBeenCalledWith('parking-lot-id-1');
      expect(result).toEqual(detail);
    });
  });
});
