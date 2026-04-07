import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { Trim } from '../../../common/decorators/trim.decorator';
import { ParkingSlotSize } from '../../../database/entities/parking-slot.entity';

export class CreateParkingLotSlotDto {
  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  from: number;

  @ApiProperty({ example: 20, minimum: 1 })
  @IsInt()
  @Min(1)
  to: number;

  @ApiProperty({ enum: ParkingSlotSize, example: ParkingSlotSize.SMALL })
  @IsEnum(ParkingSlotSize)
  size: ParkingSlotSize;
}

export class CreateParkingLotDto {
  @ApiProperty({ example: 'Parking A', maxLength: 100 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  parkingLotName: string;

  @ApiProperty({ type: [CreateParkingLotSlotDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateParkingLotSlotDto)
  slots: CreateParkingLotSlotDto[];
}
