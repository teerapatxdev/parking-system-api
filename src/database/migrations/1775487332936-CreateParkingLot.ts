import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class CreateParkingLot1775487332936 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE parking_lot (
        parking_lot_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        parking_lot_name VARCHAR(100) NOT NULL UNIQUE,
        total_slots INT NOT NULL,
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
    await queryRunner.query(`DROP TABLE IF EXISTS parking_lot`);
  }
}
