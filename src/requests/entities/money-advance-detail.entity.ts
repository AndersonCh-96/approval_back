import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Request } from './request.entity';

@Entity('money_advance_details')
export class MoneyAdvanceDetail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Request, (r) => r.moneyAdvanceDetail, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request: Request;

  @Column({ name: 'request_id', type: 'uuid' })
  requestId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'text' })
  reason: string;
}