import { randomUUID } from 'node:crypto';

import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class FindUserByIdDto {
  @ApiProperty({ example: randomUUID() })
  @IsUUID()
  userId: string;
}
