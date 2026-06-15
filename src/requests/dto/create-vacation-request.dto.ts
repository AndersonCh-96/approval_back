import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateVacationRequestDto {
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsString()
  @IsOptional()
  comments?: string;
}