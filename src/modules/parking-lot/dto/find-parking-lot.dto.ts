import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { randomUUID } from 'crypto';

export class FindParkingLotByIdDto {
  @ApiProperty({ example: randomUUID() })
  @IsUUID()
  parkingLotId: string;
}
