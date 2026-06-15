import { IsNotEmpty, IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}