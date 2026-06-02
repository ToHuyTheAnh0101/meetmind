import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Meeting } from './meeting.entity';

export enum MeetingSessionStatus {
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('meeting_sessions')
@Index(['meetingId'])
export class MeetingSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Meeting, { onDelete: 'CASCADE' })
  meeting!: Meeting;

  @Column('uuid')
  meetingId!: string;

  @Column({
    type: 'enum',
    enum: MeetingSessionStatus,
    default: MeetingSessionStatus.ONGOING,
  })
  status!: MeetingSessionStatus;

  @Column({ type: 'timestamptz', nullable: true })
  actualStartTime?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  actualEndTime?: Date;

  @Column({ nullable: true })
  recordingUrl?: string;

  /** Set to true immediately when organizer clicks "Kích hoạt trợ lý AI" */
  @Column({ type: 'boolean', default: false })
  aiActivated!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
