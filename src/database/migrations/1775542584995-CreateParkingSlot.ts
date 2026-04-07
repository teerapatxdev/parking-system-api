import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class CreateParkingSlot1775542584995 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE e_parking_slot_size AS ENUM ('SMALL', 'MEDIUM', 'LARGE')`);

    await queryRunner.query(`
      CREATE TABLE parking_slot (
        parking_slot_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        parking_lot_id UUID NOT NULL REFERENCES parking_lot(parking_lot_id),
        slot_number INT NOT NULL,
        size e_parking_slot_size NOT NULL,
        is_available BOOLEAN NOT NULL DEFAULT TRUE,
        UNIQUE (parking_lot_id, slot_number)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS parking_slot`);
    await queryRunner.query(`DROP TYPE IF EXISTS e_parking_slot_size`);
  }
}
