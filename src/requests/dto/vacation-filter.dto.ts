import { IsDateString, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';
import { RequestStatus } from '../../enums/request-status.enum';

export class VacationFilterDto extends PaginationQueryDto {
  @IsDateString()
  @IsOptional()
  startDateFrom?: string;

  @IsDateString()
  @IsOptional()
  endDateTo?: string;

  @IsString()
  @IsOptional()
  status?: RequestStatus;

  @IsString()
  @IsOptional()
  search?: string;
}