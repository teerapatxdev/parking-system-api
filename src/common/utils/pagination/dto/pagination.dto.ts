import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class PaginationResult<T, D> {
  @Expose()
  @ApiProperty({ description: 'The current page in the result set' })
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };

  @Expose()
  @ApiProperty({ description: 'The array of data in the result set' })
  items: T[] | D[];
}
