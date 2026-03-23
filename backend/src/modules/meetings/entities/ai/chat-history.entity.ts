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

export enum ChatMessageType {
  USER = 'user',
  AI = 'ai',
  SYSTEM = 'system',
}

@Entity('chat_histories')
@Index(['meetingId', 'userId'])
@Index(['meetingId', 'createdAt'])
export class ChatHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Meeting, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting;

  @Column('uuid')
  meetingId: string;

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
