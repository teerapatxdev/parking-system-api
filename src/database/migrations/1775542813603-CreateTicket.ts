import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class CreateTicket1775542813603 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE ticket (
        ticket_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        parking_slot_id UUID NOT NULL REFERENCES parking_slot(parking_slot_id),
        plate_number VARCHAR(100) NOT NULL,
        car_size e_parking_slot_size NOT NULL,
        entry_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        exit_time TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by UUID,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by UUID,
        deleted_at TIMESTAMPTZ,
        deleted_by UUID
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS ticket`);
  }
}
