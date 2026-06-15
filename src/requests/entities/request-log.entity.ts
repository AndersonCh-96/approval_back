import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Request } from './request.entity';
import { LogAction } from '../../enums/log-action.enum';

@Entity('request_logs')
export class RequestLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Request, (r) => r.logs)
  @JoinColumn({ name: 'request_id' })
  request!: Request;

  @Column({ name: 'request_id', type: 'uuid' })
  requestId!: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'action_by_id' })
  actionBy!: User;

  @Column({ name: 'action_by_id', type: 'uuid' })
  actionById!: string;

  @Column({
    type: 'enum',
    enum: LogAction,
  })
  action!: LogAction;

  @Column({ type: 'text', nullable: true })
  comments?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}