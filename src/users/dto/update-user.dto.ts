import { IsString, IsEmail, IsOptional, IsUUID, IsInt, Min } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsUUID()
  @IsOptional()
  roleId?: string;

  @IsUUID()
  @IsOptional()
  bossId?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  availableVacationDays?: number;
}