import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

import { Trim } from '../../../common/decorators/trim.decorator';
import { CreateParkingLotSlotDto } from './create-parking-lot.dto';

export class UpdateParkingLotDto {
  @ApiPropertyOptional({ example: 'ลานจอด A', maxLength: 100 })
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  parkingLotName?: string;

  @ApiPropertyOptional({ type: [CreateParkingLotSlotDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateParkingLotSlotDto)
  slots?: CreateParkingLotSlotDto[];
}
