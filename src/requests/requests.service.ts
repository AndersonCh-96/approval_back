import {
  Injectable,
  NotFoundException,
  BadRequestException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Request } from './entities/request.entity';
import { VacationDetail } from './entities/vacation-detail.entity';
import { MoneyAdvanceDetail } from './entities/money-advance-detail.entity';
import { RequestLog } from './entities/request-log.entity';
import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';
import { RequestType } from '../enums/request-type.enum';
import { RequestStatus } from '../enums/request-status.enum';
import { LogAction } from '../enums/log-action.enum';
import { RoleName } from '../enums/role-name.enum';
import { CreateVacationRequestDto } from './dto/create-vacation-request.dto';
import { CreateMoneyAdvanceRequestDto } from './dto/create-money-advance-request.dto';
import { ApproveRequestDto } from './dto/approve-request.dto';
import { VacationFilterDto } from './dto/vacation-filter.dto';
import { MoneyAdvanceFilterDto } from './dto/money-advance-filter.dto';
import { PaginatedResult } from './interfaces/paginated-result.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationEvent } from '../notifications/notification-event.interface';

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(Request)
    private readonly requestRepository: Repository<Request>,
    @InjectRepository(VacationDetail)
    private readonly vacationDetailRepository: Repository<VacationDetail>,
    @InjectRepository(MoneyAdvanceDetail)
    private readonly moneyAdvanceDetailRepository: Repository<MoneyAdvanceDetail>,
    @InjectRepository(RequestLog)
    private readonly logRepository: Repository<RequestLog>,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => RolesService))
    private readonly rolesService: RolesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createVacationRequest(
    createDto: CreateVacationRequestDto,
    userId: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const totalDays = this.calculateDays(
        createDto.startDate,
        createDto.endDate,
      );

      if (totalDays > 7) {
        throw new BadRequestException(
          'Vacation request cannot exceed 7 days',
        );
      }

      if (user.availableVacationDays < totalDays) {
        throw new BadRequestException(
          `Insufficient vacation days. Available: ${user.availableVacationDays}, Requested: ${totalDays}`,
        );
      }

      const request = queryRunner.manager.create(Request, {
        userId: userId,
        type: RequestType.VACATION,
        status: RequestStatus.PENDING,
        currentApproverId: user.bossId || null,
        targetRoleId: null,
      });

      if (!user.bossId) {
        const rrhhRole = await this.rolesService.findByName(RoleName.RRHH);
        if (!rrhhRole) {
          throw new NotFoundException('RRHH role not found');
        }
        request.currentApproverId = null;
        request.targetRoleId = rrhhRole.id;
      }

      const savedRequest = await queryRunner.manager.save(request);

      const vacationDetail = queryRunner.manager.create(VacationDetail, {
        requestId: savedRequest.id,
        startDate: new Date(createDto.startDate),
        endDate: new Date(createDto.endDate),
        totalDays,
      });

      await queryRunner.manager.save(vacationDetail);

      const log = queryRunner.manager.create(RequestLog, {
        requestId: savedRequest.id,
        actionById: userId,
        action: LogAction.SUBMITTED,
        comments: createDto.comments || null,
      });

      await queryRunner.manager.save(log);
      await queryRunner.commitTransaction();

      const created = await this.findById(savedRequest.id);
      if (created) {
        this.emitNotification(created, 'SUBMITTED');
      }

      return created;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async createMoneyAdvanceRequest(
    createDto: CreateMoneyAdvanceRequestDto,
    userId: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const amount = Number(createDto.amount);
      if (amount <= 0) {
        throw new BadRequestException('Amount must be greater than 0');
      }

      if (amount > 800) {
        throw new BadRequestException(
          'Money advance request cannot exceed $800',
        );
      }

      const request = queryRunner.manager.create(Request, {
        userId: userId,
        type: RequestType.MONEY_ADVANCE,
        status: RequestStatus.PENDING,
        currentApproverId: user.bossId || null,
        targetRoleId: null,
      });

      if (!user.bossId) {
        const contadorRole = await this.rolesService.findByName(RoleName.CONTADOR);
        if (!contadorRole) {
          throw new NotFoundException('Contador role not found');
        }
        request.currentApproverId = null;
        request.targetRoleId = contadorRole.id;
      }

      const savedRequest = await queryRunner.manager.save(request);

      const moneyAdvanceDetail = queryRunner.manager.create(MoneyAdvanceDetail, {
        requestId: savedRequest.id,
        amount,
        reason: createDto.reason,
      });

      await queryRunner.manager.save(moneyAdvanceDetail);

      const log = queryRunner.manager.create(RequestLog, {
        requestId: savedRequest.id,
        actionById: userId,
        action: LogAction.SUBMITTED,
        comments: createDto.comments || null,
      });

      await queryRunner.manager.save(log);
      await queryRunner.commitTransaction();

      const created = await this.findById(savedRequest.id);
      if (created) {
        this.emitNotification(created, 'SUBMITTED');
      }

      return created;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async approve(requestId: string, approverId: string, dto: ApproveRequestDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      const request = await queryRunner.manager.findOne(Request, {
        where: { id: requestId },
        relations: ['user', 'currentApprover', 'targetRole'],
      });

      if (!request) {
        throw new NotFoundException('Request not found');
      }

      if (request.status !== RequestStatus.PENDING) {
        throw new BadRequestException(
          `Cannot approve request with status: ${request.status}`,
        );
      }

      const approver = await this.usersService.findById(approverId);
      if (!approver) {
        throw new NotFoundException('Approver not found');
      }

      const canApprove =
        request.currentApproverId === approverId ||
        (request.targetRoleId && approver.roleId === request.targetRoleId);

      if (!canApprove) {
        throw new BadRequestException(
          'You are not authorized to approve this request',
        );
      }

      const isApprovingByRole =
        request.targetRoleId && approver.roleId === request.targetRoleId;

      if (isApprovingByRole) {
        await queryRunner.manager.update(Request, requestId, {
          status: RequestStatus.APPROVED,
        });

        if (request.type === RequestType.VACATION) {
          await queryRunner.manager
            .createQueryBuilder()
            .update('users')
            .set({
              availableVacationDays: () =>
                `available_vacation_days - ${request.vacationDetail?.totalDays || 0}`,
            })
            .where('id = :id', { id: request.userId })
            .execute();
        }
      } else {
        if (approver.bossId) {
          await queryRunner.manager.update(Request, requestId, {
            currentApproverId: approver.bossId,
            targetRoleId: null,
          });
        } else {
          let targetRoleId: string | null = null;

          if (request.type === RequestType.VACATION) {
            const rrhhRole = await this.rolesService.findByName(RoleName.RRHH);
            if (!rrhhRole) {
              throw new NotFoundException('RRHH role not found');
            }
            targetRoleId = rrhhRole.id;
          } else if (request.type === RequestType.MONEY_ADVANCE) {
            const contadorRole = await this.rolesService.findByName(
              RoleName.CONTADOR,
            );
            if (!contadorRole) {
              throw new NotFoundException('Contador role not found');
            }
            targetRoleId = contadorRole.id;
          }

          await queryRunner.manager.update(Request, requestId, {
            currentApproverId: null,
            targetRoleId,
          });
        }
      }

      const log = queryRunner.manager.create(RequestLog, {
        requestId: requestId,
        actionById: approverId,
        action: LogAction.APPROVED,
        comments: dto.comments || null,
      });

      await queryRunner.manager.save(log);
      await queryRunner.commitTransaction();

      const updated = await this.findById(requestId);
      if (updated) {
        const eventType = updated.status === RequestStatus.APPROVED ? 'APPROVED' : 'NEW_PENDING';
        this.emitNotification(updated, eventType);
      }

      return updated;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async reject(
    requestId: string,
    rejecterId: string,
    dto: ApproveRequestDto,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const request = await queryRunner.manager.findOne(Request, {
        where: { id: requestId },
        relations: ['user', 'currentApprover', 'targetRole'],
      });

      if (!request) {
        throw new NotFoundException('Request not found');
      }

      if (request.status !== RequestStatus.PENDING) {
        throw new BadRequestException(
          `Cannot reject request with status: ${request.status}`,
        );
      }

      const rejecter = await this.usersService.findById(rejecterId);
      if (!rejecter) {
        throw new NotFoundException('Rejecter not found');
      }

      const canReject =
        request.currentApproverId === rejecterId ||
        (request.targetRoleId && rejecter.roleId === request.targetRoleId);

      if (!canReject) {
        throw new BadRequestException(
          'You are not authorized to reject this request',
        );
      }

      await queryRunner.manager.update(Request, requestId, {
        status: RequestStatus.REJECTED,
      });

      const log = queryRunner.manager.create(RequestLog, {
        requestId: requestId,
        actionById: rejecterId,
        action: LogAction.REJECTED,
        comments: dto.comments || null,
      });

      await queryRunner.manager.save(log);
      await queryRunner.commitTransaction();

      const updated = await this.findById(requestId);
      if (updated) {
        this.emitNotification(updated, 'REJECTED');
      }

      return updated;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findById(id: string) {
    return this.requestRepository.findOne({
      where: { id },
      relations: [
        'user',
        'user.role',
        'currentApprover',
        'currentApprover.role',
        'targetRole',
        'vacationDetail',
        'moneyAdvanceDetail',
        'logs',
        'logs.actionBy',
      ],
    });
  }

  async findAll(
    type?: RequestType,
    pagination?: { page: number; limit: number },
  ) {
    const qb = this.requestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.user', 'user')
      .leftJoinAndSelect('request.currentApprover', 'currentApprover')
      .leftJoinAndSelect('request.targetRole', 'targetRole')
      .orderBy('request.createdAt', 'DESC');

    if (type) {
      qb.andWhere('request.type = :type', { type });
    }

    if (pagination) {
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const [data, total] = await qb
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    const data = await qb.getMany();
    return { data, meta: { total: data.length, page: 1, limit: data.length, totalPages: 1 } };
  }

  async findAllVacations(
    filters: VacationFilterDto,
  ): Promise<PaginatedResult<Request>> {
    const qb = this.requestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.user', 'user')
      .leftJoinAndSelect('request.currentApprover', 'currentApprover')
      .leftJoin('request.vacationDetail', 'vacation')
      .addSelect([
        'vacation.startDate',
        'vacation.endDate',
        'vacation.totalDays',
      ])
      .where('request.type = :type', { type: RequestType.VACATION });

    if (filters.status) {
      qb.andWhere('request.status = :status', { status: filters.status });
    }
    if (filters.startDateFrom) {
      qb.andWhere('vacation.startDate >= :startDateFrom', { startDateFrom: filters.startDateFrom });
    }
    if (filters.endDateTo) {
      qb.andWhere('vacation.endDate <= :endDateTo', { endDateTo: filters.endDateTo });
    }
    if (filters.search) {
      qb.andWhere('user.name ILIKE :search', { search: `%${filters.search}%` });
    }

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'DESC';

    const [data, total] = await qb
      .orderBy(`request.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findAllMoneyAdvances(
    filters: MoneyAdvanceFilterDto,
  ): Promise<PaginatedResult<Request>> {
    const qb = this.requestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.user', 'user')
      .leftJoinAndSelect('request.currentApprover', 'currentApprover')
      .leftJoin('request.moneyAdvanceDetail', 'money')
      .addSelect(['money.amount', 'money.reason'])
      .where('request.type = :type', { type: RequestType.MONEY_ADVANCE });

    if (filters.status) {
      qb.andWhere('request.status = :status', { status: filters.status });
    }
    if (filters.amountMin != null) {
      qb.andWhere('money.amount >= :amountMin', { amountMin: filters.amountMin });
    }
    if (filters.amountMax != null) {
      qb.andWhere('money.amount <= :amountMax', { amountMax: filters.amountMax });
    }
    if (filters.search) {
      qb.andWhere('user.name ILIKE :search', { search: `%${filters.search}%` });
    }

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'DESC';

    const [data, total] = await qb
      .orderBy(`request.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findByUser(
    userId: string,
    type?: RequestType,
    pagination?: { page: number; limit: number },
  ) {
    const qb = this.requestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.user', 'user')
      .leftJoinAndSelect('request.currentApprover', 'currentApprover')
      .leftJoinAndSelect('request.targetRole', 'targetRole')
      .where('request.userId = :userId', { userId })
      .orderBy('request.createdAt', 'DESC');

    if (type) {
      qb.andWhere('request.type = :type', { type });
    }

    if (pagination) {
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const [data, total] = await qb
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    const data = await qb.getMany();
    return { data, meta: { total: data.length, page: 1, limit: data.length, totalPages: 1 } };
  }

  async findPendingForApprover(
    approverId: string,
    type?: RequestType,
    pagination?: { page: number; limit: number },
  ) {
    const approver = await this.usersService.findById(approverId);
    if (!approver) {
      return { data: [], meta: { total: 0, page: 1, limit: pagination?.limit || 10, totalPages: 0 } };
    }

    const qb = this.requestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.user', 'user')
      .leftJoinAndSelect('request.currentApprover', 'currentApprover')
      .leftJoinAndSelect('request.targetRole', 'targetRole')
      .where('request.status = :status', { status: RequestStatus.PENDING })
      .andWhere(
        '(request.currentApproverId = :approverId OR request.targetRoleId = :roleId)',
        { approverId, roleId: approver.roleId },
      );

    if (type) {
      qb.andWhere('request.type = :type', { type });
    }

    if (type === RequestType.VACATION) {
      qb.leftJoin('request.vacationDetail', 'vacation')
        .addSelect(['vacation.startDate', 'vacation.endDate', 'vacation.totalDays']);
    } else if (type === RequestType.MONEY_ADVANCE) {
      qb.leftJoin('request.moneyAdvanceDetail', 'money')
        .addSelect(['money.amount', 'money.reason']);
    }

    if (pagination) {
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const [data, total] = await qb
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    const data = await qb.getMany();
    return { data, meta: { total: data.length, page: 1, limit: data.length, totalPages: 1 } };
  }

  async getLogs(requestId: string) {
    return this.logRepository.find({
      where: { requestId },
      relations: ['actionBy', 'actionBy.role'],
      order: { createdAt: 'ASC' },
    });
  }

  private calculateDays(startDate: Date | string, endDate: Date | string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }

  private emitNotification(request: Request, action: string) {
    const label = request.type === RequestType.VACATION ? 'Vacaciones' : 'Adelanto';

    const event: NotificationEvent = {
      type: action as NotificationEvent['type'],
      title: this.getNotificationTitle(action, label),
      message: `${request.user?.name} - ${label}`,
      requestId: request.id,
      requestType: request.type,
      timestamp: new Date().toISOString(),
    };

    if (action === 'SUBMITTED' && request.currentApproverId) {
      this.notificationsService.notifyUser(request.currentApproverId, event);
    }
    if (action === 'SUBMITTED' && request.targetRoleId) {
      this.notificationsService.notifyRole(request.targetRoleId, {
        ...event,
        type: 'DEPARTMENT_PENDING',
        title: `Nueva solicitud de ${label} pendiente en tu departamento`,
      });
    }
    if (action === 'NEW_PENDING' && request.currentApproverId) {
      this.notificationsService.notifyUser(request.currentApproverId, event);
    }
    if (action === 'NEW_PENDING' && request.targetRoleId) {
      this.notificationsService.notifyRole(request.targetRoleId, {
        ...event,
        type: 'DEPARTMENT_PENDING',
        title: `Solicitud de ${label} pendiente en tu departamento`,
      });
    }
    if (action === 'APPROVED') {
      this.notificationsService.notifyUser(request.userId, {
        ...event,
        title: `Tu solicitud de ${label} fue aprobada`,
      });
    }
    if (action === 'REJECTED') {
      this.notificationsService.notifyUser(request.userId, {
        ...event,
        title: `Tu solicitud de ${label} fue rechazada`,
      });
    }
  }

  private getNotificationTitle(action: string, label: string): string {
    switch (action) {
      case 'SUBMITTED':
        return `Nueva solicitud de ${label} para aprobar`;
      case 'NEW_PENDING':
        return `Solicitud de ${label} escalada para tu aprobación`;
      case 'APPROVED':
        return `Solicitud de ${label} aprobada`;
      case 'REJECTED':
        return `Solicitud de ${label} rechazada`;
      default:
        return `Actualización de ${label}`;
    }
  }
}