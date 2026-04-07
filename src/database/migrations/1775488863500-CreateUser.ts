import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class CreateUser1775488863500 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await queryRunner.query(`CREATE TYPE e_user_role AS ENUM ('SUPER', 'ADMIN')`);

    await queryRunner.query(`
      CREATE TABLE "user" (
        user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_full_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20),
        user_role e_user_role NOT NULL DEFAULT 'ADMIN',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by UUID,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by UUID,
        deleted_at TIMESTAMPTZ,
        deleted_by UUID
      )
    `);

    await queryRunner.query(`
      WITH new_user AS (
        SELECT gen_random_uuid() AS id
      )
      INSERT INTO "user" (
        user_id,
        user_full_name,
        email,
        password_hash,
        phone_number,
        user_role,
        created_by,
        updated_by
      )
      SELECT
        id,
        'Super Admin',
        'super@parking.co',
        crypt('super123!', gen_salt('bf', 10)),
        '0000000000',
        'SUPER',
        id,
        id
      FROM new_user
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user"`);
    await queryRunner.query(`DROP TYPE IF EXISTS e_user_role`);
  }
}
