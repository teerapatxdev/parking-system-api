import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ParkingLot } from './parking-lot.entity';

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

  @ManyToOne(() => ParkingLot)
  @JoinColumn({ name: 'parking_lot_id' })
  parkingLot: ParkingLot;

  @Column({ name: 'slot_number', type: 'int' })
  slotNumber: number;

  @Column({ name: 'size', type: 'enum', enum: ParkingSlotSize, enumName: 'e_parking_slot_size' })
  size: ParkingSlotSize;

  @Column({ name: 'is_available', type: 'boolean', default: true })
  isAvailable: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'deleted_by', type: 'uuid', nullable: true })
  deletedBy: string | null;
}
