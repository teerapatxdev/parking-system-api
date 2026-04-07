import { Test, type TestingModule } from '@nestjs/testing';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';
import { ParkingSlotSize } from '../../database/entities/parking-slot.entity';
import { EThaiProvince } from '../../common/constants/thai-province.enum';
import { ESort } from '../../common/utils/filter-option/default-option.dto';
import type { Ticket } from '../../database/entities/ticket.entity';
import type { CreateTicketDto } from './dto/create-ticket.dto';
import type { UpdateTicketDto } from './dto/update-ticket.dto';
import type { CarListFilterOptionDto } from './dto/filter-option.dto';
import type { FindTicketHistoryDto } from './dto/find-ticket-history.dto';
import type { PaginationResult } from '../../common/utils/pagination/dto/pagination.dto';
import type { IFindCarList } from './interfaces/find-car-list.interface';
import type { IFindTicketHistory } from './interfaces/find-ticket-history.interface';

describe('TicketController', () => {
  let controller: TicketController;
  const parkCarMock = jest.fn();
  const leaveCarMock = jest.fn();
  const findCarListMock = jest.fn();
  const findTicketHistoryMock = jest.fn();

  const mockTicket = {
    ticketId: 'ticket-1',
    parkingSlotId: 'slot-1',
    plateNumber: '1กข1234',
    province: EThaiProvince.KRUNG_THEP_MAHA_NAKHON,
    carSize: ParkingSlotSize.SMALL,
    entryTime: new Date(),
    exitTime: null,
  } as Ticket;

  beforeEach(async () => {
    parkCarMock.mockReset();
    leaveCarMock.mockReset();
    findCarListMock.mockReset();
    findTicketHistoryMock.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketController],
      providers: [
        {
          provide: TicketService,
          useValue: {
            parkCar: parkCarMock,
            leaveCar: leaveCarMock,
            findCarList: findCarListMock,
            findTicketHistory: findTicketHistoryMock,
          },
        },
      ],
    }).compile();

    controller = module.get<TicketController>(TicketController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('parkCar', () => {
    it('should call ticketService.parkCar with body', async () => {
      const dto: CreateTicketDto = {
        parkingLotId: 'lot-1',
        plateNumber: '1กข1234',
        province: EThaiProvince.KRUNG_THEP_MAHA_NAKHON,
        carSize: ParkingSlotSize.SMALL,
      };
      parkCarMock.mockResolvedValue(mockTicket);

      const result = await controller.parkCar(dto);

      expect(parkCarMock).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockTicket);
    });
  });

  describe('leaveCar', () => {
    it('should call ticketService.leaveCar with body', async () => {
      const dto: UpdateTicketDto = {
        parkingLotId: 'lot-1',
        plateNumber: '1กข1234',
        province: EThaiProvince.KRUNG_THEP_MAHA_NAKHON,
      };
      const exited = { ...mockTicket, exitTime: new Date() } as Ticket;
      leaveCarMock.mockResolvedValue(exited);

      const result = await controller.leaveCar(dto);

      expect(leaveCarMock).toHaveBeenCalledWith(dto);
      expect(result).toEqual(exited);
    });
  });

  describe('findCarList', () => {
    it('should call ticketService.findCarList with parkingLotId and filters', async () => {
      const filters: CarListFilterOptionDto = { page: 1, limit: 10 };
      const paginationResult: PaginationResult<Ticket, IFindCarList> = {
        items: [],
        meta: { totalItems: 0, itemCount: 0, itemsPerPage: 10, totalPages: 0, currentPage: 1 },
      };
      findCarListMock.mockResolvedValue(paginationResult);

      const result = await controller.findCarList({ parkingLotId: 'lot-1' }, filters);

      expect(findCarListMock).toHaveBeenCalledWith('lot-1', filters);
      expect(result).toEqual(paginationResult);
    });
  });

  describe('findTicketHistory', () => {
    it('should call ticketService.findTicketHistory with filters', async () => {
      const filters: FindTicketHistoryDto = {
        plateNumber: '1กข1234',
        province: EThaiProvince.KRUNG_THEP_MAHA_NAKHON,
        order: ESort.DESC,
        page: 1,
        limit: 10,
      };
      const paginationResult: PaginationResult<Ticket, IFindTicketHistory> = {
        items: [],
        meta: { totalItems: 0, itemCount: 0, itemsPerPage: 10, totalPages: 0, currentPage: 1 },
      };
      findTicketHistoryMock.mockResolvedValue(paginationResult);

      const result = await controller.findTicketHistory(filters);

      expect(findTicketHistoryMock).toHaveBeenCalledWith(filters);
      expect(result).toEqual(paginationResult);
    });
  });
});
