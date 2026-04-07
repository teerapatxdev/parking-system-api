import { Test, type TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EntityManager, IsNull, type Repository, type SelectQueryBuilder } from 'typeorm';
import { TicketService } from './ticket.service';
import { Ticket } from '../../database/entities/ticket.entity';
import { ParkingLot } from '../../database/entities/parking-lot.entity';
import { ParkingSlot, ParkingSlotSize } from '../../database/entities/parking-slot.entity';
import { EThaiProvince } from '../../common/constants/thai-province.enum';
import { ESort } from '../../common/utils/filter-option/default-option.dto';
import { ECarListSortColumn } from './dto/filter-option.dto';
import * as paginationModule from '../../common/utils/pagination/pagination-raw-custom';
import type { CreateTicketDto } from './dto/create-ticket.dto';
import type { UpdateTicketDto } from './dto/update-ticket.dto';

type TicketRepoMock = jest.Mocked<Pick<Repository<Ticket>, 'findOneBy' | 'create' | 'save' | 'createQueryBuilder'>>;
type ParkingLotRepoMock = jest.Mocked<Pick<Repository<ParkingLot>, 'findOneBy'>>;
type ParkingSlotRepoMock = jest.Mocked<Pick<Repository<ParkingSlot>, 'findOneBy' | 'save' | 'createQueryBuilder'>>;

describe('TicketService', () => {
  let service: TicketService;
  let ticketRepo: TicketRepoMock;
  let parkingLotRepo: ParkingLotRepoMock;
  let parkingSlotRepo: ParkingSlotRepoMock;
  let trxTicketRepo: TicketRepoMock;
  let trxParkingSlotRepo: ParkingSlotRepoMock;
  let transactionMock: jest.Mock;

  const buildSlot = (overrides: Partial<ParkingSlot> = {}): ParkingSlot =>
    ({
      parkingSlotId: 'slot-1',
      parkingLotId: 'lot-1',
      slotNumber: 1,
      size: ParkingSlotSize.SMALL,
      isAvailable: true,
      ...overrides,
    }) as ParkingSlot;

  const buildTicket = (overrides: Partial<Ticket> = {}): Ticket =>
    ({
      ticketId: 'ticket-1',
      parkingSlotId: 'slot-1',
      plateNumber: '1กข1234',
      province: EThaiProvince.KRUNG_THEP_MAHA_NAKHON,
      carSize: ParkingSlotSize.SMALL,
      entryTime: new Date(),
      exitTime: null,
      ...overrides,
    }) as Ticket;

  beforeEach(async () => {
    ticketRepo = {
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    parkingLotRepo = { findOneBy: jest.fn() };
    parkingSlotRepo = {
      findOneBy: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    trxTicketRepo = {
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    trxParkingSlotRepo = {
      findOneBy: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const trxManager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === Ticket) return trxTicketRepo;
        if (entity === ParkingSlot) return trxParkingSlotRepo;
        return undefined;
      }),
    };

    transactionMock = jest.fn((cb: (mgr: typeof trxManager) => unknown) => cb(trxManager));

    const entityManagerMock = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === Ticket) return ticketRepo;
        if (entity === ParkingLot) return parkingLotRepo;
        if (entity === ParkingSlot) return parkingSlotRepo;
        return undefined;
      }),
      transaction: transactionMock,
    } as unknown as EntityManager;

    const module: TestingModule = await Test.createTestingModule({
      providers: [TicketService, { provide: EntityManager, useValue: entityManagerMock }],
    }).compile();

    service = module.get<TicketService>(TicketService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parkCar', () => {
    const dto: CreateTicketDto = {
      parkingLotId: 'lot-1',
      plateNumber: '1กข1234',
      province: EThaiProvince.KRUNG_THEP_MAHA_NAKHON,
      carSize: ParkingSlotSize.SMALL,
    };

    it('should throw NotFoundException when parking lot does not exist', async () => {
      parkingLotRepo.findOneBy.mockResolvedValue(null);

      await expect(service.parkCar(dto)).rejects.toThrow(new NotFoundException('Parking lot not found.'));
      expect(transactionMock).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when an active ticket already exists for the car', async () => {
      parkingLotRepo.findOneBy.mockResolvedValue({ parkingLotId: 'lot-1' } as ParkingLot);
      ticketRepo.findOneBy.mockResolvedValue(buildTicket());

      await expect(service.parkCar(dto)).rejects.toThrow(new ConflictException('This car is already parked.'));
      expect(ticketRepo.findOneBy).toHaveBeenCalledWith({
        plateNumber: dto.plateNumber,
        province: dto.province,
        exitTime: IsNull(),
      });
      expect(transactionMock).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when no available slot is found', async () => {
      parkingLotRepo.findOneBy.mockResolvedValue({ parkingLotId: 'lot-1' } as ParkingLot);
      ticketRepo.findOneBy.mockResolvedValue(null);

      const qb = {
        setLock: jest.fn().mockReturnThis(),
        setOnLocked: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      } as unknown as SelectQueryBuilder<ParkingSlot>;
      trxParkingSlotRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(service.parkCar(dto)).rejects.toThrow(new ConflictException('Parking lot is full.'));
      expect(transactionMock).toHaveBeenCalledTimes(1);
    });

    it('should mark slot as unavailable and create ticket on success', async () => {
      parkingLotRepo.findOneBy.mockResolvedValue({ parkingLotId: 'lot-1' } as ParkingLot);
      ticketRepo.findOneBy.mockResolvedValue(null);

      const slot = buildSlot();
      const qb = {
        setLock: jest.fn().mockReturnThis(),
        setOnLocked: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(slot),
      } as unknown as SelectQueryBuilder<ParkingSlot>;
      trxParkingSlotRepo.createQueryBuilder.mockReturnValue(qb);
      trxParkingSlotRepo.save.mockResolvedValue({ ...slot, isAvailable: false } as never);

      const createdTicket = buildTicket();
      trxTicketRepo.create.mockReturnValue(createdTicket);
      trxTicketRepo.save.mockResolvedValue(createdTicket as never);

      const result = await service.parkCar(dto);

      expect(trxParkingSlotRepo.save).toHaveBeenCalledWith({ ...slot, isAvailable: false });
      expect(trxTicketRepo.create).toHaveBeenCalledWith({
        parkingSlotId: slot.parkingSlotId,
        plateNumber: dto.plateNumber,
        province: dto.province,
        carSize: dto.carSize,
      });
      expect(trxTicketRepo.save).toHaveBeenCalledWith(createdTicket);
      expect(result).toEqual(createdTicket);
    });
  });

  describe('leaveCar', () => {
    const dto: UpdateTicketDto = {
      parkingLotId: 'lot-1',
      plateNumber: '1กข1234',
      province: EThaiProvince.KRUNG_THEP_MAHA_NAKHON,
    };

    it('should throw NotFoundException when parking lot does not exist', async () => {
      parkingLotRepo.findOneBy.mockResolvedValue(null);

      await expect(service.leaveCar(dto)).rejects.toThrow(new NotFoundException('Parking lot not found.'));
    });

    it('should throw NotFoundException when no active ticket is found', async () => {
      parkingLotRepo.findOneBy.mockResolvedValue({ parkingLotId: 'lot-1' } as ParkingLot);
      ticketRepo.findOneBy.mockResolvedValue(null);

      await expect(service.leaveCar(dto)).rejects.toThrow(NotFoundException);
      expect(transactionMock).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when parking slot is missing inside transaction', async () => {
      parkingLotRepo.findOneBy.mockResolvedValue({ parkingLotId: 'lot-1' } as ParkingLot);
      ticketRepo.findOneBy.mockResolvedValue(buildTicket());
      trxParkingSlotRepo.findOneBy.mockResolvedValue(null);

      await expect(service.leaveCar(dto)).rejects.toThrow(NotFoundException);
    });

    it('should free slot and set exit time on success', async () => {
      parkingLotRepo.findOneBy.mockResolvedValue({ parkingLotId: 'lot-1' } as ParkingLot);
      const ticket = buildTicket();
      ticketRepo.findOneBy.mockResolvedValue(ticket);

      const slot = buildSlot({ isAvailable: false });
      trxParkingSlotRepo.findOneBy.mockResolvedValue(slot);
      trxParkingSlotRepo.save.mockResolvedValue({ ...slot, isAvailable: true } as never);
      trxTicketRepo.save.mockImplementation((t) => Promise.resolve(t as Ticket) as never);

      const result = await service.leaveCar(dto);

      expect(trxParkingSlotRepo.save).toHaveBeenCalledWith({ ...slot, isAvailable: true });
      expect(trxTicketRepo.save).toHaveBeenCalledWith(expect.objectContaining({ ticketId: ticket.ticketId }));
      expect(result.exitTime).toBeInstanceOf(Date);
    });
  });

  describe('findCarList', () => {
    const buildQb = () => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
    });

    it('should apply default ordering by province when sortBy is not provided', async () => {
      const qb = buildQb();
      ticketRepo.createQueryBuilder.mockReturnValue(qb as unknown as SelectQueryBuilder<Ticket>);
      const paginationResult = {
        items: [],
        meta: { totalItems: 0, itemCount: 0, itemsPerPage: 10, totalPages: 0, currentPage: 1 },
      };
      const paginateSpy = jest
        .spyOn(paginationModule, 'paginateRawCustom')
        .mockResolvedValue(paginationResult as never);

      const result = await service.findCarList('lot-1', {});

      expect(qb.where).toHaveBeenCalledWith('pl.parking_lot_id = :parkingLotId', { parkingLotId: 'lot-1' });
      expect(qb.andWhere).toHaveBeenCalledWith('t.exit_time IS NULL');
      expect(qb.orderBy).toHaveBeenCalledWith('t.province', ESort.ASC);
      expect(paginateSpy).toHaveBeenCalledWith(qb, { page: 1, limit: 10 });
      expect(result).toEqual(paginationResult);
    });

    it('should apply all filters and custom sort', async () => {
      const qb = buildQb();
      ticketRepo.createQueryBuilder.mockReturnValue(qb as unknown as SelectQueryBuilder<Ticket>);
      jest.spyOn(paginationModule, 'paginateRawCustom').mockResolvedValue({
        items: [],
        meta: { totalItems: 0, itemCount: 0, itemsPerPage: 5, totalPages: 0, currentPage: 2 },
      } as never);

      await service.findCarList('lot-1', {
        plateNumber: '1กข',
        province: EThaiProvince.KRUNG_THEP_MAHA_NAKHON,
        carSize: ParkingSlotSize.SMALL,
        sortBy: ECarListSortColumn.SLOT_NUMBER,
        order: ESort.DESC,
        page: 2,
        limit: 5,
      });

      expect(qb.andWhere).toHaveBeenCalledWith('t.plate_number ILIKE :plateNumber', { plateNumber: '%1กข%' });
      expect(qb.andWhere).toHaveBeenCalledWith('t.province = :province', {
        province: EThaiProvince.KRUNG_THEP_MAHA_NAKHON,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('t.car_size = :carSize', { carSize: ParkingSlotSize.SMALL });
      expect(qb.orderBy).toHaveBeenCalledWith('ps.slot_number', ESort.DESC);
    });
  });

  describe('findTicketHistory', () => {
    const buildQb = () => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
    });

    it('should apply default DESC order and required filters', async () => {
      const qb = buildQb();
      ticketRepo.createQueryBuilder.mockReturnValue(qb as unknown as SelectQueryBuilder<Ticket>);
      const paginationResult = {
        items: [],
        meta: { totalItems: 0, itemCount: 0, itemsPerPage: 10, totalPages: 0, currentPage: 1 },
      };
      const paginateSpy = jest
        .spyOn(paginationModule, 'paginateRawCustom')
        .mockResolvedValue(paginationResult as never);

      const result = await service.findTicketHistory({
        plateNumber: '1กข1234',
        province: EThaiProvince.KRUNG_THEP_MAHA_NAKHON,
      });

      expect(qb.where).toHaveBeenCalledWith('t.plate_number = :plateNumber', { plateNumber: '1กข1234' });
      expect(qb.andWhere).toHaveBeenCalledWith('t.province = :province', {
        province: EThaiProvince.KRUNG_THEP_MAHA_NAKHON,
      });
      expect(qb.orderBy).toHaveBeenCalledWith('t.entry_time', ESort.DESC);
      expect(paginateSpy).toHaveBeenCalledWith(qb, { page: 1, limit: 10 });
      expect(result).toEqual(paginationResult);
    });

    it('should apply from/to date filters and custom order', async () => {
      const qb = buildQb();
      ticketRepo.createQueryBuilder.mockReturnValue(qb as unknown as SelectQueryBuilder<Ticket>);
      jest.spyOn(paginationModule, 'paginateRawCustom').mockResolvedValue({
        items: [],
        meta: { totalItems: 0, itemCount: 0, itemsPerPage: 20, totalPages: 0, currentPage: 3 },
      } as never);

      const from = new Date('2026-01-01');
      const to = new Date('2026-12-31');

      await service.findTicketHistory({
        plateNumber: '1กข1234',
        province: EThaiProvince.KRUNG_THEP_MAHA_NAKHON,
        from,
        to,
        order: ESort.ASC,
        page: 3,
        limit: 20,
      });

      expect(qb.andWhere).toHaveBeenCalledWith('t.entry_time >= :from', { from });
      expect(qb.andWhere).toHaveBeenCalledWith('t.entry_time <= :to', { to });
      expect(qb.orderBy).toHaveBeenCalledWith('t.entry_time', ESort.ASC);
    });
  });
});
