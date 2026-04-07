import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, Not, Repository } from 'typeorm';
import { CreateParkingLotDto, CreateParkingLotSlotDto } from './dto/create-parking-lot.dto';
import { ParkingLot } from '../../database/entities/parking-lot.entity';
import { ParkingSlot, ParkingSlotSize } from '../../database/entities/parking-slot.entity';
import { UpdateParkingLotDto } from './dto/update-parking-lot.dto';
import { IFindParkingLotDetail, IQueryParkingSlotDetail } from './interfaces/find-parking-lot.interface';

@Injectable()
export class ParkingLotService {
  private parkingLotRepo: Repository<ParkingLot>;
  private parkingSlotRepo: Repository<ParkingSlot>;
  constructor(private manager: EntityManager) {
    this.parkingLotRepo = this.manager.getRepository(ParkingLot);
    this.parkingSlotRepo = this.manager.getRepository(ParkingSlot);
  }

  async create(body: CreateParkingLotDto, userId: string): Promise<ParkingLot> {
    this.validateSlotRanges(body.slots);

    const duplicateParkingLot = await this.parkingLotRepo.findOneBy({ parkingLotName: body.parkingLotName });
    if (duplicateParkingLot) {
      throw new ConflictException(`Parking name ${body.parkingLotName} already exists.`);
    }

    const totalSlots = body.slots.reduce((sum, range) => sum + (range.to - range.from + 1), 0);

    return await this.manager.transaction(async (trx) => {
      const parkingLotRepo = trx.getRepository(ParkingLot);
      const parkingSlotRepo = trx.getRepository(ParkingSlot);

      const created = await parkingLotRepo.save(
        parkingLotRepo.create({
          parkingLotName: body.parkingLotName,
          totalSlots,
          createdBy: userId,
          updatedBy: userId,
        }),
      );

      const slotEntities: ParkingSlot[] = [];
      for (const range of body.slots) {
        for (let slotNumber = range.from; slotNumber <= range.to; slotNumber++) {
          slotEntities.push(
            parkingSlotRepo.create({
              parkingLotId: created.parkingLotId,
              slotNumber,
              size: range.size,
            }),
          );
        }
      }

      await parkingSlotRepo.save(slotEntities);

      return created;
    });
  }

  async update(parkingLotId: string, body: UpdateParkingLotDto, userId: string): Promise<ParkingLot> {
    const parkingLot = await this.parkingLotRepo.findOneBy({ parkingLotId });
    if (!parkingLot) {
      throw new NotFoundException('Parking lot not found.');
    }

    if (body.parkingLotName) {
      const duplicateParkingLot = await this.parkingLotRepo.findOneBy({
        parkingLotName: body.parkingLotName,
        parkingLotId: Not(parkingLotId),
      });
      if (duplicateParkingLot) {
        throw new ConflictException(`Parking name ${body.parkingLotName} already exists.`);
      }
    }

    if (body.slots) {
      this.validateSlotRanges(body.slots);

      const occupiedSlot = await this.parkingSlotRepo.findOneBy({
        parkingLotId,
        isAvailable: false,
      });
      if (occupiedSlot) {
        throw new ConflictException('Cannot update slots while some slots are still occupied.');
      }
    }

    return await this.manager.transaction(async (trx) => {
      const parkingLotRepo = trx.getRepository(ParkingLot);
      const parkingSlotRepo = trx.getRepository(ParkingSlot);

      if (body.slots) {
        await parkingSlotRepo.delete({ parkingLotId });

        const slotEntities: ParkingSlot[] = [];
        for (const range of body.slots) {
          for (let slotNumber = range.from; slotNumber <= range.to; slotNumber++) {
            slotEntities.push(
              parkingSlotRepo.create({
                parkingLotId,
                slotNumber,
                size: range.size,
              }),
            );
          }
        }

        await parkingSlotRepo.save(slotEntities);

        parkingLot.totalSlots = body.slots.reduce((sum, range) => sum + (range.to - range.from + 1), 0);
      }

      return await parkingLotRepo.save({
        ...parkingLot,
        parkingLotName: body.parkingLotName ?? parkingLot.parkingLotName,
        updatedBy: userId,
      });
    });
  }

  async delete(parkingLotId: string, userId: string): Promise<ParkingLot> {
    const parkingLot = await this.parkingLotRepo.findOneBy({ parkingLotId });
    if (!parkingLot) {
      throw new NotFoundException('Parking lot not found.');
    }

    const occupiedSlot = await this.parkingSlotRepo.findOneBy({
      parkingLotId,
      isAvailable: false,
    });
    if (occupiedSlot) {
      throw new ConflictException('Cannot delete parking lot while some slots are still occupied.');
    }

    return await this.manager.transaction(async (trx) => {
      const parkingLotRepo = trx.getRepository(ParkingLot);
      const parkingSlotRepo = trx.getRepository(ParkingSlot);

      await parkingSlotRepo.delete({ parkingLotId });

      await parkingLotRepo.save({ ...parkingLot, updatedBy: userId, deletedBy: userId });
      await parkingLotRepo.softDelete({ parkingLotId });

      return parkingLot;
    });
  }

  private validateSlotRanges(slots: CreateParkingLotSlotDto[]): void {
    for (const range of slots) {
      if (range.from > range.to) {
        throw new BadRequestException(
          `Invalid slot range: from (${String(range.from)}) must be less than or equal to to (${String(range.to)}).`,
        );
      }
    }

    const sorted = [...slots].sort((a, b) => a.from - b.from);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (curr.from <= prev.to) {
        throw new BadRequestException(
          `Slot ranges overlap: [${String(prev.from)}-${String(prev.to)}] and [${String(curr.from)}-${String(curr.to)}].`,
        );
      }
      if (curr.from !== prev.to + 1) {
        throw new BadRequestException(
          `Slot ranges must be contiguous: [${String(prev.from)}-${String(prev.to)}] should be followed by ${String(prev.to + 1)}, but got ${String(curr.from)}.`,
        );
      }
    }
  }

  async findOneById(parkingLotId: string): Promise<IFindParkingLotDetail> {
    const parkingLotDetail = await this.parkingLotRepo
      .createQueryBuilder('pl')
      .select('pl.parking_lot_name', 'parkingLotName')
      .addSelect('pl.total_slots', 'totalSlots')
      .addSelect(
        `
          COUNT(
            CASE 
              WHEN ps.is_available = true AND ps.size = '${ParkingSlotSize.SMALL}'
              THEN ps.parking_slot_id 
            END
          )::INT
        `,
        'availableSmallSlots',
      )
      .addSelect(
        `
          COUNT(
            CASE 
              WHEN ps.is_available = true AND ps.size = '${ParkingSlotSize.MEDIUM}'
              THEN ps.parking_slot_id 
            END
          )::INT
        `,
        'availableMediumSlots',
      )
      .addSelect(
        `
          COUNT(
            CASE 
              WHEN ps.is_available = true AND ps.size = '${ParkingSlotSize.LARGE}'
              THEN ps.parking_slot_id 
            END
          )::INT
        `,
        'availableLargeSlots',
      )
      .leftJoin(ParkingSlot, 'ps', 'ps.parking_lot_id = pl.parking_lot_id')
      .where('pl.parking_lot_id = :parkingLotId', { parkingLotId })
      .groupBy('pl.parking_lot_id')
      .addGroupBy('pl.parking_lot_name')
      .addGroupBy('pl.total_slots')
      .getRawOne<IQueryParkingSlotDetail>();

    if (!parkingLotDetail) {
      throw new NotFoundException(`Parking lot id ${parkingLotId} not found.`);
    }

    return {
      parkingLotName: parkingLotDetail.parkingLotName,
      totalSlots: parkingLotDetail.totalSlots,
      totalAvailableSlots: {
        small: parkingLotDetail.availableSmallSlots,
        medium: parkingLotDetail.availableMediumSlots,
        large: parkingLotDetail.availableLargeSlots,
      },
    };
  }
}
