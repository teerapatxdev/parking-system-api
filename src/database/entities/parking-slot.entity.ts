import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

export enum ParkingSlotSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
}

@Entity({ name: 'parking_slot' })
@Unique(['parkingLotId', 'slotNumber'])
export class ParkingSlot {
  @PrimaryGeneratedColumn('uuid', { name: 'parking_slot_id' })
  parkingSlotId: string;

  @Column({ name: 'parking_lot_id', type: 'uuid' })
  parkingLotId: string;

  @Column({ name: 'slot_number', type: 'int' })
  slotNumber: number;

  @Column({ name: 'size', type: 'enum', enum: ParkingSlotSize, enumName: 'e_parking_slot_size' })
  size: ParkingSlotSize;

  @Column({ name: 'is_available', type: 'boolean', default: true })
  isAvailable: boolean;
}
