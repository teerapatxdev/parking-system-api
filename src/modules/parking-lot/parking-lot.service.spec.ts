import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EntityManager, Not, type Repository, type SelectQueryBuilder } from 'typeorm';
import { ParkingLotService } from './parking-lot.service';
import { ParkingLot } from '../../database/entities/parking-lot.entity';
import { ParkingSlot, ParkingSlotSize } from '../../database/entities/parking-slot.entity';
import type { CreateParkingLotDto } from './dto/create-parking-lot.dto';
import type { UpdateParkingLotDto } from './dto/update-parking-lot.dto';
import { EParkingLotListSortColumn } from './dto/find-parking-lot-list.dto';
import { ESort } from '../../common/utils/filter-option/default-option.dto';
import * as paginationModule from '../../common/utils/pagination/pagination-raw-custom';

describe('ParkingLotService', () => {
  let service: ParkingLotService;
  let parkingLotRepo: jest.Mocked<
    Pick<Repository<ParkingLot>, 'findOneBy' | 'create' | 'save' | 'softDelete' | 'createQueryBuilder'>
  >;
  let parkingSlotRepo: jest.Mocked<Pick<Repository<ParkingSlot>, 'findOneBy' | 'create' | 'save' | 'delete'>>;
  let entityManagerMock: jest.Mocked<Pick<EntityManager, 'getRepository' | 'transaction'>>;

  const currentUserId = 'current-user-id';

  const buildParkingLot = (overrides: Partial<ParkingLot> = {}): ParkingLot =>
    ({
      parkingLotId: 'parking-lot-id-1',
      parkingLotName: 'Parking A',
      totalSlots: 10,
      createdAt: new Date(),
      createdBy: currentUserId,
      updatedAt: new Date(),
      updatedBy: currentUserId,
      deletedAt: null,
      deletedBy: null,
      ...overrides,
    }) as ParkingLot;

  beforeEach(async () => {
    parkingLotRepo = {
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      softDelete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    parkingSlotRepo = {
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    entityManagerMock = {
      getRepository: jest.fn().mockImplementation((entity: unknown) => {
        if (entity === ParkingLot) return parkingLotRepo;
        if (entity === ParkingSlot) return parkingSlotRepo;
        return null;
      }),
      transaction: jest.fn().mockImplementation(async (cb: (trx: EntityManager) => Promise<unknown>) => {
        const trx = {
          getRepository: jest.fn().mockImplementation((entity: unknown) => {
            if (entity === ParkingLot) return parkingLotRepo;
            if (entity === ParkingSlot) return parkingSlotRepo;
            return null;
          }),
        } as unknown as EntityManager;
        return cb(trx);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ParkingLotService, { provide: EntityManager, useValue: entityManagerMock }],
    }).compile();

    service = module.get<ParkingLotService>(ParkingLotService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateParkingLotDto = {
      parkingLotName: 'Parking A',
      slots: [
        { from: 1, to: 5, size: ParkingSlotSize.SMALL },
        { from: 6, to: 10, size: ParkingSlotSize.MEDIUM },
      ],
    };

    it('should create a parking lot with computed total slots', async () => {
      const created = buildParkingLot({ totalSlots: 10 });
      parkingLotRepo.findOneBy.mockResolvedValue(null);
      parkingLotRepo.create.mockReturnValue(created);
      parkingLotRepo.save.mockResolvedValue(created);
      parkingSlotRepo.create.mockImplementation((slot) => slot as ParkingSlot);
      parkingSlotRepo.save.mockResolvedValue([] as unknown as ParkingSlot);

      const result = await service.create(dto, currentUserId);

      expect(parkingLotRepo.findOneBy).toHaveBeenCalledWith({ parkingLotName: dto.parkingLotName });
      expect(parkingLotRepo.create).toHaveBeenCalledWith({
        parkingLotName: dto.parkingLotName,
        totalSlots: 10,
        createdBy: currentUserId,
        updatedBy: currentUserId,
      });
      expect(parkingSlotRepo.create).toHaveBeenCalledTimes(10);
      expect(parkingSlotRepo.save).toHaveBeenCalledTimes(1);
      const savedSlots = parkingSlotRepo.save.mock.calls[0][0] as ParkingSlot[];
      expect(savedSlots).toHaveLength(10);
      expect(savedSlots[0]).toEqual(
        expect.objectContaining({ slotNumber: 1, size: ParkingSlotSize.SMALL, parkingLotId: created.parkingLotId }),
      );
      expect(savedSlots[9]).toEqual(
        expect.objectContaining({ slotNumber: 10, size: ParkingSlotSize.MEDIUM, parkingLotId: created.parkingLotId }),
      );
      expect(result).toEqual(created);
    });

    it('should throw ConflictException when parking lot name already exists', async () => {
      parkingLotRepo.findOneBy.mockResolvedValue(buildParkingLot());

      await expect(service.create(dto, currentUserId)).rejects.toThrow(
        new ConflictException(`Parking name ${dto.parkingLotName} already exists.`),
      );
      expect(entityManagerMock.transaction).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when slot range from > to', async () => {
      const invalidDto: CreateParkingLotDto = {
        parkingLotName: 'Parking A',
        slots: [{ from: 5, to: 1, size: ParkingSlotSize.SMALL }],
      };

      await expect(service.create(invalidDto, currentUserId)).rejects.toThrow(BadRequestException);
      expect(parkingLotRepo.findOneBy).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when slot ranges overlap', async () => {
      const invalidDto: CreateParkingLotDto = {
        parkingLotName: 'Parking A',
        slots: [
          { from: 1, to: 5, size: ParkingSlotSize.SMALL },
          { from: 4, to: 8, size: ParkingSlotSize.MEDIUM },
        ],
      };

      await expect(service.create(invalidDto, currentUserId)).rejects.toThrow(/overlap/);
    });

    it('should throw BadRequestException when slot ranges are not contiguous', async () => {
      const invalidDto: CreateParkingLotDto = {
        parkingLotName: 'Parking A',
        slots: [
          { from: 1, to: 5, size: ParkingSlotSize.SMALL },
          { from: 7, to: 10, size: ParkingSlotSize.MEDIUM },
        ],
      };

      await expect(service.create(invalidDto, currentUserId)).rejects.toThrow(/contiguous/);
    });
  });

  describe('update', () => {
    const parkingLotId = 'parking-lot-id-1';

    it('should throw NotFoundException when parking lot does not exist', async () => {
      parkingLotRepo.findOneBy.mockResolvedValue(null);

      await expect(service.update(parkingLotId, {}, currentUserId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when new name already exists on another parking lot', async () => {
      parkingLotRepo.findOneBy
        .mockResolvedValueOnce(buildParkingLot())
        .mockResolvedValueOnce(buildParkingLot({ parkingLotId: 'other-id', parkingLotName: 'Parking B' }));

      const dto: UpdateParkingLotDto = { parkingLotName: 'Parking B' };

      await expect(service.update(parkingLotId, dto, currentUserId)).rejects.toThrow(
        new ConflictException('Parking name Parking B already exists.'),
      );
      expect(parkingLotRepo.findOneBy).toHaveBeenNthCalledWith(2, {
        parkingLotName: 'Parking B',
        parkingLotId: Not(parkingLotId),
      });
    });

    it('should throw ConflictException when updating slots while some are occupied', async () => {
      parkingLotRepo.findOneBy.mockResolvedValue(buildParkingLot());
      parkingSlotRepo.findOneBy.mockResolvedValue({ isAvailable: false } as ParkingSlot);

      const dto: UpdateParkingLotDto = {
        slots: [{ from: 1, to: 3, size: ParkingSlotSize.SMALL }],
      };

      await expect(service.update(parkingLotId, dto, currentUserId)).rejects.toThrow(
        new ConflictException('Cannot update slots while some slots are still occupied.'),
      );
    });

    it('should update parking lot name only when slots are not provided', async () => {
      const existing = buildParkingLot();
      parkingLotRepo.findOneBy.mockResolvedValueOnce(existing).mockResolvedValueOnce(null);
      parkingLotRepo.save.mockImplementation((p) => Promise.resolve(p as ParkingLot));

      const result = await service.update(parkingLotId, { parkingLotName: 'New Name' }, currentUserId);

      expect(parkingSlotRepo.delete).not.toHaveBeenCalled();
      expect(parkingSlotRepo.save).not.toHaveBeenCalled();
      expect(result.parkingLotName).toBe('New Name');
      expect(result.updatedBy).toBe(currentUserId);
    });

    it('should replace slots and recompute total slots when slots are provided', async () => {
      const existing = buildParkingLot({ totalSlots: 10 });
      parkingLotRepo.findOneBy.mockResolvedValue(existing);
      parkingSlotRepo.findOneBy.mockResolvedValue(null);
      parkingSlotRepo.create.mockImplementation((slot) => slot as ParkingSlot);
      parkingSlotRepo.save.mockResolvedValue([] as unknown as ParkingSlot);
      parkingLotRepo.save.mockImplementation((p) => Promise.resolve(p as ParkingLot));

      const dto: UpdateParkingLotDto = {
        slots: [{ from: 1, to: 4, size: ParkingSlotSize.LARGE }],
      };

      const result = await service.update(parkingLotId, dto, currentUserId);

      expect(parkingSlotRepo.delete).toHaveBeenCalledWith({ parkingLotId });
      const savedSlots = parkingSlotRepo.save.mock.calls[0][0] as ParkingSlot[];
      expect(savedSlots).toHaveLength(4);
      expect(result.totalSlots).toBe(4);
      expect(result.updatedBy).toBe(currentUserId);
    });
  });

  describe('delete', () => {
    const parkingLotId = 'parking-lot-id-1';

    it('should throw NotFoundException when parking lot does not exist', async () => {
      parkingLotRepo.findOneBy.mockResolvedValue(null);

      await expect(service.delete(parkingLotId, currentUserId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when some slots are still occupied', async () => {
      parkingLotRepo.findOneBy.mockResolvedValue(buildParkingLot());
      parkingSlotRepo.findOneBy.mockResolvedValue({ isAvailable: false } as ParkingSlot);

      await expect(service.delete(parkingLotId, currentUserId)).rejects.toThrow(
        new ConflictException('Cannot delete parking lot while some slots are still occupied.'),
      );
    });

    it('should soft delete the parking lot and remove its slots', async () => {
      const existing = buildParkingLot();
      parkingLotRepo.findOneBy.mockResolvedValue(existing);
      parkingSlotRepo.findOneBy.mockResolvedValue(null);
      parkingLotRepo.save.mockImplementation((p) => Promise.resolve(p as ParkingLot));
      parkingLotRepo.softDelete.mockResolvedValue({ affected: 1 } as never);

      const result = await service.delete(parkingLotId, currentUserId);

      expect(parkingSlotRepo.delete).toHaveBeenCalledWith({ parkingLotId });
      expect(parkingLotRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ updatedBy: currentUserId, deletedBy: currentUserId }),
      );
      expect(parkingLotRepo.softDelete).toHaveBeenCalledWith({ parkingLotId });
      expect(result).toEqual(existing);
    });
  });

  describe('findAll', () => {
    const buildListQb = () => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should apply default ordering by created_at DESC and map raw rows', async () => {
      const qb = buildListQb();
      parkingLotRepo.createQueryBuilder.mockReturnValue(qb as unknown as SelectQueryBuilder<ParkingLot>);

      const rawRow = {
        parkingLotId: 'lot-1',
        parkingLotName: 'Parking A',
        totalSlots: 10,
        availableSmallSlots: 3,
        availableMediumSlots: 4,
        availableLargeSlots: 2,
      };
      const paginateSpy = jest
        .spyOn(paginationModule, 'paginateRawCustom')
        .mockImplementation((_qb, _opts, mapFunc) => {
          const items = mapFunc ? mapFunc([rawRow] as never) : ([rawRow] as never);
          return Promise.resolve({
            items,
            meta: { totalItems: 1, itemCount: 1, itemsPerPage: 10, totalPages: 1, currentPage: 1 },
          } as never);
        });

      const result = await service.findAll({});

      expect(qb.where).not.toHaveBeenCalled();
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(qb.orderBy).toHaveBeenCalledWith('pl.created_at', ESort.DESC);
      expect(paginateSpy).toHaveBeenCalledWith(qb, { page: 1, limit: 10 }, expect.any(Function));
      expect(result.items).toEqual([
        {
          parkingLotId: 'lot-1',
          parkingLotName: 'Parking A',
          totalSlots: 10,
          totalAvailableSlots: { small: 3, medium: 4, large: 2 },
        },
      ]);
    });

    it('should apply name filter and custom sort', async () => {
      const qb = buildListQb();
      parkingLotRepo.createQueryBuilder.mockReturnValue(qb as unknown as SelectQueryBuilder<ParkingLot>);
      jest.spyOn(paginationModule, 'paginateRawCustom').mockResolvedValue({
        items: [],
        meta: { totalItems: 0, itemCount: 0, itemsPerPage: 5, totalPages: 0, currentPage: 2 },
      } as never);

      await service.findAll({
        parkingLotName: 'Park',
        sortBy: EParkingLotListSortColumn.PARKING_LOT_NAME,
        order: ESort.ASC,
        page: 2,
        limit: 5,
      });

      expect(qb.where).toHaveBeenCalledWith('pl.parking_lot_name ILIKE :parkingLotName', {
        parkingLotName: '%Park%',
      });
      expect(qb.orderBy).toHaveBeenCalledWith('pl.parking_lot_name', ESort.ASC);
    });
  });

  describe('findOneById', () => {
    const parkingLotId = 'parking-lot-id-1';

    const buildQueryBuilder = (raw: unknown) => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(raw),
      };
      return qb;
    };

    it('should return mapped parking lot detail when found', async () => {
      const raw = {
        parkingLotName: 'Parking A',
        totalSlots: 10,
        availableSmallSlots: 3,
        availableMediumSlots: 4,
        availableLargeSlots: 2,
      };
      const qb = buildQueryBuilder(raw);
      parkingLotRepo.createQueryBuilder.mockReturnValue(qb as never);

      const result = await service.findOneById(parkingLotId);

      expect(qb.where).toHaveBeenCalledWith('pl.parking_lot_id = :parkingLotId', { parkingLotId });
      expect(result).toEqual({
        parkingLotName: 'Parking A',
        totalSlots: 10,
        totalAvailableSlots: { small: 3, medium: 4, large: 2 },
      });
    });

    it('should throw NotFoundException when parking lot is not found', async () => {
      const qb = buildQueryBuilder(undefined);
      parkingLotRepo.createQueryBuilder.mockReturnValue(qb as never);

      await expect(service.findOneById(parkingLotId)).rejects.toThrow(
        new NotFoundException(`Parking lot id ${parkingLotId} not found.`),
      );
    });
  });
});
