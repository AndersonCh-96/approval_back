import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../roles/entities/role.entity';
import { RequestType } from '../../enums/request-type.enum';
import { RequestStatus } from '../../enums/request-status.enum';
import { VacationDetail } from './vacation-detail.entity';
import { MoneyAdvanceDetail } from './money-advance-detail.entity';
import { RequestLog } from './request-log.entity';

@Entity('requests')
@Index('idx_requests_status_type', ['status', 'type'])
@Index('idx_requests_approver', ['currentApproverId'])
@Index('idx_requests_target_role', ['targetRoleId'])
@Index('idx_requests_user', ['userId'])
@Index('idx_requests_created', ['createdAt'])
export class Request {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({
    type: 'enum',
    enum: RequestType,
  })
  type!: RequestType;

  @Column({
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.PENDING,
  })
  status!: RequestStatus;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'current_approver_id' })
  currentApprover?: User | null;

  @Column({ name: 'current_approver_id', type: 'uuid', nullable: true })
  currentApproverId?: string | null;

  @ManyToOne(() => Role, { eager: true, nullable: true })
  @JoinColumn({ name: 'target_role_id' })
  targetRole?: Role | null;

  @Column({ name: 'target_role_id', type: 'uuid', nullable: true })
  targetRoleId?: string | null;

  @OneToOne(() => VacationDetail, (d) => d.request, { cascade: true, nullable: true })
  vacationDetail?: VacationDetail | null;

  @OneToOne(() => MoneyAdvanceDetail, (d) => d.request, { cascade: true, nullable: true })
  moneyAdvanceDetail?: MoneyAdvanceDetail | null;

  @OneToMany(() => RequestLog, (log) => log.request)
  logs?: RequestLog[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}