import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { Meeting } from '../core/meeting.entity';
import { User } from '../../../users/user.entity';

export enum AccessRequestStatus {
  WAITING = 'waiting',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

@Entity('access_requests')
@Index(['meetingId'])
export class AccessRequest {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @ManyToOne(() => Meeting, { onDelete: 'CASCADE' })
  meeting?: Meeting;

  @Column('uuid')
  meetingId?: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  requesterUser?: User;

  @Column('uuid')
  requesterUserId?: string;

  @Column({
    type: 'enum',
    enum: AccessRequestStatus,
    default: AccessRequestStatus.WAITING,
  })
  status?: AccessRequestStatus;

  @Column()
  requestedAt?: Date;

  @Column({ nullable: true })
  approvedAt?: Date;

  @Column({ nullable: true })
  rejectedAt?: Date;

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;
}
