import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { Meeting } from '../../meetings/entities';
import { User } from '../../users/user.entity';

import { ChatMessageType } from '../../../common/enums';
export { ChatMessageType };

@Entity('chat_histories')
@Index(['meetingId', 'userId'])
@Index(['meetingId', 'createdAt'])
export class ChatHistory {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @ManyToOne(() => Meeting, { onDelete: 'CASCADE' })
  meeting?: Meeting;

  @Column('uuid')
  meetingId?: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user?: User;

  @Column('uuid')
  userId?: string;

  @Column({ type: 'enum', enum: ChatMessageType })
  messageType?: ChatMessageType;

  @Column({ type: 'text' })
  content?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>; // For storing context, tokens used, etc.

  @CreateDateColumn()
  createdAt?: Date;
}
