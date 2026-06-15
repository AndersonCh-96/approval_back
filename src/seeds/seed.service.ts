import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { RoleName } from '../enums/role-name.enum';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    await this.seed();
  }

  async seed() {
    const existingAdmin = await this.roleRepository.findOne({
      where: { name: RoleName.ADMIN },
    });

    if (existingAdmin) {
      return;
    }

    const roles = await this.createRoles();
    const users = await this.createUsers(roles);

    console.log('Seed completed successfully');
    console.log('Users created:', users.map((u) => u.email).join(', '));
  }

  private async createRoles() {
    const rolesData = [
      { name: RoleName.EMPLEADO },
      { name: RoleName.GERENTE },
      { name: RoleName.RRHH },
      { name: RoleName.CONTADOR },
      { name: RoleName.ADMIN },
    ];

    const roles: Record<string, Role> = {};

    for (const roleData of rolesData) {
      const existingRole = await this.roleRepository.findOne({
        where: { name: roleData.name },
      });

      if (!existingRole) {
        const role = this.roleRepository.create(roleData);
        roles[roleData.name] = await this.roleRepository.save(role);
      } else {
        roles[roleData.name] = existingRole;
      }
    }

    return roles;
  }

  private async createUsers(roles: Record<string, Role>) {
    const hashedPassword = await bcrypt.hash('password123', 10);

    const admin = await this.userRepository.findOne({
      where: { email: 'admin@company.com' },
    });

    if (!admin) {
      const adminUser = this.userRepository.create({
        name: 'Administrador',
        email: 'admin@company.com',
        password: hashedPassword,
        roleId: roles[RoleName.ADMIN].id,
        bossId: null,
        availableVacationDays: 0,
      });
      await this.userRepository.save(adminUser);
    }

    const rrhh = await this.userRepository.findOne({
      where: { email: 'rrhh@company.com' },
    });

    if (!rrhh) {
      const adminUser = await this.userRepository.findOne({
        where: { email: 'admin@company.com' },
      });

      const rrhhUser = this.userRepository.create({
        name: 'Responsable RRHH',
        email: 'rrhh@company.com',
        password: hashedPassword,
        roleId: roles[RoleName.RRHH].id,
        bossId: adminUser?.id || null,
        availableVacationDays: 0,
      });
      await this.userRepository.save(rrhhUser);
    }

    const contador = await this.userRepository.findOne({
      where: { email: 'contador@company.com' },
    });

    if (!contador) {
      const adminUser = await this.userRepository.findOne({
        where: { email: 'admin@company.com' },
      });

      const contadorUser = this.userRepository.create({
        name: 'Contador',
        email: 'contador@company.com',
        password: hashedPassword,
        roleId: roles[RoleName.CONTADOR].id,
        bossId: adminUser?.id || null,
        availableVacationDays: 0,
      });
      await this.userRepository.save(contadorUser);
    }

    const gerente = await this.userRepository.findOne({
      where: { email: 'gerente@company.com' },
    });

    if (!gerente) {
      const gerenteUser = this.userRepository.create({
        name: 'Gerente',
        email: 'gerente@company.com',
        password: hashedPassword,
        roleId: roles[RoleName.GERENTE].id,
        bossId: null,
        availableVacationDays: 0,
      });
      await this.userRepository.save(gerenteUser);
    }

    const empleado = await this.userRepository.findOne({
      where: { email: 'empleado@company.com' },
    });

    if (!empleado) {
      const gerenteUser = await this.userRepository.findOne({
        where: { email: 'gerente@company.com' },
      });

      const empleadoUser = this.userRepository.create({
        name: 'Juan Empleado',
        email: 'empleado@company.com',
        password: hashedPassword,
        roleId: roles[RoleName.EMPLEADO].id,
        bossId: gerenteUser?.id || null,
        availableVacationDays: 14,
      });
      await this.userRepository.save(empleadoUser);
    }

    return this.userRepository.find();
  }
}