import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async create(createDto: CreateRoleDto): Promise<Role> {
    const existingRole = await this.roleRepository.findOne({
      where: { name: createDto.name },
    });
    if (existingRole) {
      throw new ConflictException(`Role with name '${createDto.name}' already exists`);
    }
    const role = this.roleRepository.create(createDto);
    return this.roleRepository.save(role);
  }

  async findAll(): Promise<Role[]> {
    return this.roleRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['users'],
    });
    if (!role) {
      throw new NotFoundException(`Role with ID '${id}' not found`);
    }
    return role;
  }

  async findByName(name: string): Promise<Role | null> {
    return this.roleRepository.findOne({ where: { name } });
  }

  async update(id: string, updateDto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id);
    if (updateDto.name && updateDto.name !== role.name) {
      const existingRole = await this.roleRepository.findOne({
        where: { name: updateDto.name },
      });
      if (existingRole) {
        throw new ConflictException(`Role with name '${updateDto.name}' already exists`);
      }
    }
    Object.assign(role, updateDto);
    return this.roleRepository.save(role);
  }

  async remove(id: string): Promise<void> {
    const role = await this.findOne(id);
    if (role.users && role.users.length > 0) {
      throw new ConflictException(
        `Cannot delete role '${role.name}' because it has ${role.users.length} associated users`,
      );
    }
    await this.roleRepository.remove(role);
  }
}