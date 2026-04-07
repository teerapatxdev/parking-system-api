import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class CreateTicket1775542813603 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE ticket (
        ticket_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        parking_slot_id UUID NOT NULL REFERENCES parking_slot(parking_slot_id),
        plate_number VARCHAR(100) NOT NULL,
        province VARCHAR(100) NOT NULL,
        car_size e_parking_slot_size NOT NULL,
        entry_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        exit_time TIMESTAMPTZ
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS ticket`);
  }
}
