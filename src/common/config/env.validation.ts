import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsString, validateSync } from 'class-validator';

enum Environment {
  DEV = 'DEV',
  STAGING = 'UAT',
  PRODUCTION = 'PROD',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  MODE!: Environment;

  @IsNumber()
  PORT: number;

  @IsString()
  CLIENT_ORIGIN: string;

  @IsString()
  DB_HOST: string;

  @IsNumber()
  DB_PORT: number;

  @IsString()
  DB_USERNAME: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  DB_NAME: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_EXPIRES_IN: string;
}

export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors.map((error) => Object.values(error.constraints ?? {}).join(', ')).join('\n');
    throw new Error(`Environment validation failed:\n${messages}`);
  }

  return validatedConfig;
}
