import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
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
  @JoinColumn({ name: 'meeting_id' })
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

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
