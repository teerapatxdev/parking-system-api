import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ParkingSlotSize } from './parking-slot.entity';

@Entity({ name: 'ticket' })
export class Ticket {
  @PrimaryGeneratedColumn('uuid', { name: 'ticket_id' })
  ticketId: string;

  @Column({ name: 'parking_slot_id', type: 'uuid' })
  parkingSlotId: string;

  @Column({ name: 'plate_number', type: 'varchar', length: 100 })
  plateNumber: string;

  @Column({ name: 'province', type: 'varchar', length: 100 })
  province: string;

  @Column({ name: 'car_size', type: 'enum', enum: ParkingSlotSize, enumName: 'e_parking_slot_size' })
  carSize: ParkingSlotSize;

  @Column({ name: 'entry_time', type: 'timestamptz', default: () => 'NOW()' })
  entryTime: Date;

  @Column({ name: 'exit_time', type: 'timestamptz', nullable: true })
  exitTime: Date | null;
}
