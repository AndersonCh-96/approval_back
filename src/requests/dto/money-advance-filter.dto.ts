import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from './pagination-query.dto';
import { RequestStatus } from '../../enums/request-status.enum';

export class MoneyAdvanceFilterDto extends PaginationQueryDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  amountMin?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  amountMax?: number;

  @IsString()
  @IsOptional()
  status?: RequestStatus;

  @IsString()
  @IsOptional()
  search?: string;
}