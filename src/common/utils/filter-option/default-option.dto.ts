import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max } from 'class-validator';

export enum ESort {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class DefaultOptionDTO {
  @ApiProperty({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Max(200)
  limit?: number;

  @ApiProperty({ default: 1 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number;
}
