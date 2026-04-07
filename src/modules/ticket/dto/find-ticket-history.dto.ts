import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Trim } from '../../../common/decorators/trim.decorator';
import { EThaiProvince } from '../../../common/constants/thai-province.enum';
import { DefaultOptionDTO, ESort } from '../../../common/utils/filter-option/default-option.dto';

export class FindTicketHistoryDto extends DefaultOptionDTO {
  @ApiProperty({ example: '1กข1234', maxLength: 10, type: 'string' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  plateNumber: string;

  @ApiProperty({ enum: EThaiProvince, example: EThaiProvince.KRUNG_THEP_MAHA_NAKHON })
  @IsEnum(EThaiProvince)
  province: EThaiProvince;

  @ApiPropertyOptional({ example: new Date(), type: 'string' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date | null;

  @ApiPropertyOptional({ example: new Date(), type: 'string' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date | null;

  @ApiPropertyOptional({ enum: ESort, example: ESort.DESC })
  @IsEnum(ESort)
  @IsOptional()
  order?: ESort | null;
}
