import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto {
  name?: string;
  email?: string;
  password?: string;
  roleId?: string;
  bossId?: string;
  availableVacationDays?: number;
}