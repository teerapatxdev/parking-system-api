import { ApiProperty } from '@nestjs/swagger';
import { Trim } from '../../../common/decorators/trim.decorator';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { EThaiProvince } from '../../../common/constants/thai-province.enum';
import { FindParkingLotByIdDto } from '../../parking-lot/dto/find-parking-lot.dto';

export class UpdateTicketDto extends FindParkingLotByIdDto {
  @ApiProperty({ example: '1กข1234', maxLength: 10, type: 'string' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  plateNumber: string;

  @ApiProperty({ enum: EThaiProvince, example: EThaiProvince.KRUNG_THEP_MAHA_NAKHON })
  @IsEnum(EThaiProvince)
  province: EThaiProvince;
}
