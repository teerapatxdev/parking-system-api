import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class SetTimezone1775531833473 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        EXECUTE 'ALTER DATABASE ' || quote_ident(current_database()) || ' SET timezone TO ''Asia/Bangkok''';
      END
      $$;
    `);
    await queryRunner.query(`SET TIME ZONE 'Asia/Bangkok'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        EXECUTE 'ALTER DATABASE ' || quote_ident(current_database()) || ' SET timezone TO ''UTC''';
      END
      $$;
    `);
    await queryRunner.query(`SET TIME ZONE 'UTC'`);
  }
}
