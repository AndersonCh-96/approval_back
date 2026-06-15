import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateMoneyAdvanceRequestDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(800)
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  comments?: string;
}