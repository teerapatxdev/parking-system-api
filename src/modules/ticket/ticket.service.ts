import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, IsNull, Repository } from 'typeorm';
import { ParkingLot } from '../../database/entities/parking-lot.entity';
import { ParkingSlot, ParkingSlotSize } from '../../database/entities/parking-slot.entity';
import { Ticket } from '../../database/entities/ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { PaginationResult } from '../../common/utils/pagination/dto/pagination.dto';
import { IFindCarList } from './interfaces/find-car-list.interface';
import { CarListFilterOptionDto, ECarListSortColumn } from './dto/filter-option.dto';
import { paginateRawCustom } from '../../common/utils/pagination/pagination-raw-custom';
import { ESort } from '../../common/utils/filter-option/default-option.dto';
import { FindTicketHistoryDto } from './dto/find-ticket-history.dto';
import { IFindTicketHistory } from './interfaces/find-ticket-history.interface';

const ELIGIBLE_SLOT_SIZES: Record<ParkingSlotSize, ParkingSlotSize[]> = {
  [ParkingSlotSize.SMALL]: [ParkingSlotSize.SMALL, ParkingSlotSize.MEDIUM, ParkingSlotSize.LARGE],
  [ParkingSlotSize.MEDIUM]: [ParkingSlotSize.MEDIUM, ParkingSlotSize.LARGE],
  [ParkingSlotSize.LARGE]: [ParkingSlotSize.LARGE],
};

@Injectable()
export class TicketService {
  private ticketRepo: Repository<Ticket>;
  private parkingLotRepo: Repository<ParkingLot>;
  private parkingSlotRepo: Repository<ParkingSlot>;
  constructor(private manager: EntityManager) {
    this.ticketRepo = this.manager.getRepository(Ticket);
    this.parkingLotRepo = this.manager.getRepository(ParkingLot);
    this.parkingSlotRepo = this.manager.getRepository(ParkingSlot);
  }

  async parkCar(body: CreateTicketDto): Promise<Ticket> {
    const parkingLot = await this.parkingLotRepo.findOneBy({ parkingLotId: body.parkingLotId });
    if (!parkingLot) {
      throw new NotFoundException('Parking lot not found.');
    }

    const activeTicket = await this.ticketRepo.findOneBy({
      plateNumber: body.plateNumber,
      province: body.province,
      exitTime: IsNull(),
    });
    if (activeTicket) {
      throw new ConflictException('This car is already parked.');
    }

    return this.manager.transaction(async (trx) => {
      const ticketRepo = trx.getRepository(Ticket);
      const parkingSlotRepo = trx.getRepository(ParkingSlot);

      const availableSlot = await parkingSlotRepo
        .createQueryBuilder('slot')
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .where('slot.parking_lot_id = :parkingLotId', { parkingLotId: body.parkingLotId })
        .andWhere('slot.size IN (:...sizes)', { sizes: ELIGIBLE_SLOT_SIZES[body.carSize] })
        .andWhere('slot.is_available = true')
        .orderBy('slot.slot_number', 'ASC')
        .getOne();
      if (!availableSlot) {
        throw new ConflictException('Parking lot is full.');
      }

      await parkingSlotRepo.save({
        ...availableSlot,
        isAvailable: false,
      });

      const ticket = ticketRepo.create({
        parkingSlotId: availableSlot.parkingSlotId,
        plateNumber: body.plateNumber,
        province: body.province,
        carSize: body.carSize,
      });

      return ticketRepo.save(ticket);
    });
  }

  async leaveCar(body: UpdateTicketDto): Promise<Ticket> {
    const parkingLot = await this.parkingLotRepo.findOneBy({ parkingLotId: body.parkingLotId });
    if (!parkingLot) {
      throw new NotFoundException('Parking lot not found.');
    }

    const ticket = await this.ticketRepo.findOneBy({
      plateNumber: body.plateNumber,
      province: body.province,
      exitTime: IsNull(),
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket of ${body.plateNumber} - ${body.province} not found.`);
    }

    return this.manager.transaction(async (trx) => {
      const ticketRepo = trx.getRepository(Ticket);
      const parkingSlotRepo = trx.getRepository(ParkingSlot);

      const parkingSlot = await parkingSlotRepo.findOneBy({ parkingSlotId: ticket.parkingSlotId });
      if (!parkingSlot) {
        throw new NotFoundException(`Parking slot of ${body.plateNumber} - ${body.province} not found.`);
      }

      await parkingSlotRepo.save({
        ...parkingSlot,
        isAvailable: true,
      });

      return await ticketRepo.save({
        ...ticket,
        exitTime: new Date(),
      });
    });
  }

  async findCarList(
    parkingLotId: string,
    filters: CarListFilterOptionDto,
  ): Promise<PaginationResult<Ticket, IFindCarList>> {
    const carListQb = this.ticketRepo
      .createQueryBuilder('t')
      .select('ps.slot_number', 'slotNumber')
      .addSelect('t.plate_number', 'plateNumber')
      .addSelect('t.province', 'province')
      .addSelect('t.car_size', 'carSize')
      .leftJoin(ParkingSlot, 'ps', 'ps.parking_slot_id = t.parking_slot_id')
      .leftJoin(ParkingLot, 'pl', 'pl.parking_lot_id = ps.parking_lot_id')
      .where('pl.parking_lot_id = :parkingLotId', { parkingLotId })
      .andWhere('t.exit_time IS NULL');

    if (filters.plateNumber) {
      carListQb.andWhere('t.plate_number ILIKE :plateNumber', { plateNumber: `%${filters.plateNumber}%` });
    }
    if (filters.province) {
      carListQb.andWhere('t.province = :province', { province: filters.province });
    }
    if (filters.carSize) {
      carListQb.andWhere('t.car_size = :carSize', { carSize: filters.carSize });
    }

    const SORT_MAP: Record<ECarListSortColumn, string> = {
      [ECarListSortColumn.SLOT_NUMBER]: 'ps.slot_number',
      [ECarListSortColumn.PLATE_NUMBER]: 't.plate_number',
      [ECarListSortColumn.PROVINCE]: 't.province',
      [ECarListSortColumn.CAR_SIZE]: 't.car_size',
    };

    if (filters.sortBy && filters.sortBy in SORT_MAP) {
      carListQb.orderBy(SORT_MAP[filters.sortBy], filters.order ?? ESort.ASC);
    } else {
      carListQb.orderBy('t.province', ESort.ASC);
    }

    const result = await paginateRawCustom<Ticket, IFindCarList>(carListQb, {
      page: filters.page ?? 1,
      limit: filters.limit ?? 10,
    });

    return result;
  }

  async findTicketHistory(filters: FindTicketHistoryDto): Promise<PaginationResult<Ticket, IFindTicketHistory>> {
    const historyQb = this.ticketRepo
      .createQueryBuilder('t')
      .select('t.ticket_id', 'ticketId')
      .addSelect('pl.parking_lot_id', 'parkingLotId')
      .addSelect('pl.parking_lot_name', 'parkingLotName')
      .addSelect('ps.slot_number', 'slotNumber')
      .addSelect('t.car_size', 'carSize')
      .addSelect('t.entry_time', 'entryTime')
      .addSelect('t.exit_time', 'exitTime')
      .addSelect(
        `CASE
          WHEN t.exit_time IS NOT NULL
          THEN EXTRACT(EPOCH FROM (t.exit_time - t.entry_time))::INT / 60
          ELSE NULL
        END`,
        'durationMinutes',
      )
      .leftJoin(ParkingSlot, 'ps', 'ps.parking_slot_id = t.parking_slot_id')
      .leftJoin(ParkingLot, 'pl', 'pl.parking_lot_id = ps.parking_lot_id')
      .where('t.plate_number = :plateNumber', { plateNumber: filters.plateNumber })
      .andWhere('t.province = :province', { province: filters.province });

    if (filters.from) {
      historyQb.andWhere('t.entry_time >= :from', { from: filters.from });
    }
    if (filters.to) {
      historyQb.andWhere('t.entry_time <= :to', { to: filters.to });
    }

    historyQb.orderBy('t.entry_time', filters.order ?? ESort.DESC);

    const result = await paginateRawCustom<Ticket, IFindTicketHistory>(historyQb, {
      page: filters.page ?? 1,
      limit: filters.limit ?? 10,
    });

    return result;
  }
}
