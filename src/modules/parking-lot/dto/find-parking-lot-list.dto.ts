import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { DefaultOptionDTO, ESort } from '../../../common/utils/filter-option/default-option.dto';

export enum EParkingLotListSortColumn {
  PARKING_LOT_NAME = 'parkingLotName',
  TOTAL_SLOTS = 'totalSlots',
  CREATED_AT = 'createdAt',
}

export class FindParkingLotListDto extends DefaultOptionDTO {
  @ApiPropertyOptional({ example: 'Parking', maxLength: 100, type: 'string' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  parkingLotName?: string | null;

  @ApiPropertyOptional({ enum: ESort, example: ESort.ASC })
  @IsEnum(ESort)
  @IsOptional()
  order?: ESort | null;

  @ValidateIf((o: FindParkingLotListDto) => !!o.order)
  @ApiPropertyOptional({ enum: EParkingLotListSortColumn, example: EParkingLotListSortColumn.PARKING_LOT_NAME })
  @IsEnum(EParkingLotListSortColumn)
  @IsOptional()
  sortBy?: EParkingLotListSortColumn | null;
}
