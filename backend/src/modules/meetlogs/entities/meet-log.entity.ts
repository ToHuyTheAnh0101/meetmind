import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { Meeting } from '../../meetings/entities';
import { User } from '../../users/entities/user.entity';

import { LogType } from '../../../common/enums';
export { LogType };

@Entity('meet_logs')
@Index(['meetingId'])
export class MeetLog {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @ManyToOne(() => Meeting, {
    onDelete: 'CASCADE',
  })
  meeting?: Meeting;

  @Column('uuid')
  meetingId?: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  triggeredByUser?: User;

  @Column('uuid')
  triggeredByUserId?: string;

  @Column({ type: 'enum', enum: LogType })
  type?: LogType;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt?: Date;
}
