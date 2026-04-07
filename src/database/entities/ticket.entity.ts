import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ParkingSlot, ParkingSlotSize } from './parking-slot.entity';

@Entity({ name: 'ticket' })
export class Ticket {
  @PrimaryGeneratedColumn('uuid', { name: 'ticket_id' })
  ticketId: string;

  @Column({ name: 'parking_slot_id', type: 'uuid' })
  parkingSlotId: string;

  @ManyToOne(() => ParkingSlot)
  @JoinColumn({ name: 'parking_slot_id' })
  parkingSlot: ParkingSlot;

  @Column({ name: 'plate_number', type: 'varchar', length: 100 })
  plateNumber: string;

  @Column({ name: 'car_size', type: 'enum', enum: ParkingSlotSize, enumName: 'e_parking_slot_size' })
  carSize: ParkingSlotSize;

  @Column({ name: 'entry_time', type: 'timestamptz', default: () => 'NOW()' })
  entryTime: Date;

  @Column({ name: 'exit_time', type: 'timestamptz', nullable: true })
  exitTime: Date | null;

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
