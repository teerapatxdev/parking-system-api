import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'parking_lot' })
export class ParkingLot {
  @PrimaryGeneratedColumn('uuid', { name: 'parking_lot_id' })
  parkingLotId: string;

  @Column({ name: 'parking_lot_name', type: 'varchar', length: 100 })
  parkingLotName: string;

  @Column({ name: 'total_slots', type: 'int' })
  totalSlots: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'updated_by', type: 'uuid' })
  updatedBy: string;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'deleted_by', type: 'uuid', nullable: true })
  deletedBy: string | null;
}
