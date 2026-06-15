import {
  Injectable,
  NotFoundException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['role', 'boss'],
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['role', 'boss'],
    });
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      relations: ['role', 'boss'],
    });
  }

  async findSubordinates(bossId: string): Promise<User[]> {
    return this.userRepository.find({
      where: { bossId },
      relations: ['role'],
    });
  }

  async create(data: {
    name: string;
    email: string;
    password: string;
    roleId?: string;
    bossId?: string;
    availableVacationDays?: number;
  }): Promise<User> {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  async findOrCreateRole(name: string): Promise<Role> {
    let role = await this.roleRepository.findOne({ where: { name } });
    if (!role) {
      role = this.roleRepository.create({ name });
      role = await this.roleRepository.save(role);
    }
    return role;
  }

  async updateVacationDays(userId: string, days: number): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.availableVacationDays = days;
    return this.userRepository.save(user);
  }

  async decrementVacationDays(userId: string, days: number): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.availableVacationDays < days) {
      throw new Error('Insufficient vacation days');
    }
    user.availableVacationDays -= days;
    return this.userRepository.save(user);
  }

  async update(id: string, data: {
    name?: string;
    email?: string;
    password?: string;
    roleId?: string;
    bossId?: string;
    availableVacationDays?: number;
  }): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    console.log('Updating user with data:', data);
    if (data.name !== undefined) user.name = data.name;
    if (data.email !== undefined) user.email = data.email;
    if (data.password !== undefined) {
      user.password = await bcrypt.hash(data.password, 10);
    }
    if (data.roleId !== undefined) user.roleId = data.roleId;
    if (data.bossId !== undefined) user.bossId = data.bossId;
    if (data.availableVacationDays !== undefined) {
      user.availableVacationDays = data.availableVacationDays;
    }

    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.userRepository.remove(user);
  }
}