import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { MeetingSession } from '../../meetings/entities';
import { User } from '../../users/user.entity';

export enum EventType {
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  SCREEN_SHARE_START = 'screen_share_start',
  SCREEN_SHARE_END = 'screen_share_end',
  POLL_STARTED = 'poll_started',
  POLL_ENDED = 'poll_ended',
  QA_OPENED = 'qa_opened',
  QA_CLOSED = 'qa_closed',
  RECORDING_STARTED = 'recording_started',
  RECORDING_STOPPED = 'recording_stopped',
}

@Entity('meeting-events')
@Index(['sessionId'])
export class MeetingEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MeetingSession, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session: MeetingSession;

  @Column('uuid', { name: 'session_id' })
  sessionId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'triggered_by_user_id' })
  triggeredByUser: User;

  @Column('uuid')
  triggeredByUserId: string;

  @Column({ type: 'enum', enum: EventType })
  type: EventType;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
