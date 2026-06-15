import { IsNotEmpty, IsString, IsEmail, IsOptional, IsInt, Min, IsUUID } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

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