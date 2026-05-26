import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Meeting } from '../core/meeting.entity';
import { User } from '../../../users/user.entity';
import { MeetingSession } from '../core/meeting-session.entity';

export enum ChatMessageType {
  USER = 'user',
  AI = 'ai',
  SYSTEM = 'system',
}

@Entity('chat_histories')
@Index(['sessionId', 'userId'])
@Index(['sessionId', 'createdAt'])
export class ChatHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Meeting, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting;

  @Column('uuid')
  meetingId: string;

  @Column('uuid', { nullable: true })
  sessionId?: string;

  @ManyToOne(() => MeetingSession, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'session_id' })
  session?: MeetingSession;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('uuid')
  userId: string;

  @Column({ type: 'enum', enum: ChatMessageType })
  messageType: ChatMessageType;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // For storing context, tokens used, etc.

  @CreateDateColumn()
  createdAt: Date;
}
