import { type ObjectLiteral, type SelectQueryBuilder } from 'typeorm';
import { type IPaginateOptions } from './interfaces/pagination-option.interface';
import { type PaginationResult } from './dto/pagination.dto';

export async function paginateRawCustom<T extends ObjectLiteral, D = T>(
  qb: SelectQueryBuilder<T>,
  options: IPaginateOptions = {
    limit: 10,
    page: 1,
  },
  mapFunc?: (data: T[]) => D[],
): Promise<PaginationResult<T, D>> {
  const offset = (options.page - 1) * options.limit;

  const [items, total] = await Promise.all([
    qb.clone().limit(options.limit).offset(offset).getRawMany<T>(),
    qb.clone().getCount(),
  ]);

  const totalPage = Math.ceil(total / (options.limit || 10));

  const mappedItems = mapFunc ? mapFunc(items) : (items as unknown as D[]);

  return {
    items: mappedItems,
    meta: {
      totalItems: total,
      itemCount: items.length,
      itemsPerPage: options.limit || 10,
      totalPages: totalPage,
      currentPage: options.page,
    },
  };
}
