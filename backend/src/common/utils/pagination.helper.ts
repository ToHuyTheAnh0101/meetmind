import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { PaginatedResult, PaginationMeta } from '../interfaces/paginated-result.interface';

export class PaginationHelper {
  static getSkipTake(queryDto: PaginationQueryDto): { skip: number; take: number } {
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const skip = (page - 1) * limit;
    
    return { skip, take: limit };
  }

  static createPaginatedResult<T>(
    items: T[],
    total: number,
    queryDto: PaginationQueryDto,
  ): PaginatedResult<T> {
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const totalPages = Math.ceil(total / limit);

    const meta: PaginationMeta = {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };

    return { items, meta };
  }
}
