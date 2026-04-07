import { randomUUID } from 'node:crypto';

import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class FindParkingLotByIdDto {
  @ApiProperty({ example: randomUUID() })
  @IsUUID()
  parkingLotId: string;
}
