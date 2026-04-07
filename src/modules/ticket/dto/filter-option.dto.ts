import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { EThaiProvince } from '../../../common/constants/thai-province.enum';
import { ParkingSlotSize } from '../../../database/entities/parking-slot.entity';
import { DefaultOptionDTO, ESort } from '../../../common/utils/filter-option/default-option.dto';

export enum ECarListSortColumn {
  SLOT_NUMBER = 'slotNumber',
  PLATE_NUMBER = 'plateNumber',
  PROVINCE = 'province',
  CAR_SIZE = 'carSize',
}

export class CarListFilterOptionDto extends DefaultOptionDTO {
  @ApiPropertyOptional({ enum: ESort, example: ESort.ASC })
  @IsEnum(ESort)
  @IsOptional()
  order?: ESort | null;

  @ValidateIf((o: CarListFilterOptionDto) => !!o.order)
  @ApiPropertyOptional({ enum: ECarListSortColumn, example: ECarListSortColumn.PROVINCE })
  @IsEnum(ECarListSortColumn)
  @IsOptional()
  sortBy?: ECarListSortColumn | null;

  @ApiPropertyOptional({ example: '1กข1234', maxLength: 10, type: 'string' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  plateNumber?: string | null;

  @ApiPropertyOptional({ enum: EThaiProvince, example: EThaiProvince.KRUNG_THEP_MAHA_NAKHON })
  @IsEnum(EThaiProvince)
  @IsOptional()
  province?: EThaiProvince | null;

  @ApiPropertyOptional({ enum: ParkingSlotSize, example: ParkingSlotSize.SMALL })
  @IsEnum(ParkingSlotSize)
  @IsOptional()
  carSize?: ParkingSlotSize | null;
}
