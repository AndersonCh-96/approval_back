import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Request } from './request.entity';

@Entity('vacation_details')
export class VacationDetail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Request, (r) => r.vacationDetail, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request: Request;

  @Column({ name: 'request_id', type: 'uuid' })
  requestId: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate: Date;

  @Column({ name: 'total_days', type: 'int' })
  totalDays: number;
}