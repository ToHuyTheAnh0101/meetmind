import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { MeetingSession } from './meeting-session.entity';
import { User } from '../../../users/user.entity';

@Entity('meeting_chat_messages')
@Index(['sessionId'])
@Index(['breakoutRoomId'])
export class MeetingChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  sessionId: string;

  @ManyToOne(() => MeetingSession, { onDelete: 'CASCADE' })
  session: MeetingSession;

  @Column('uuid')
  senderUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderUserId' })
  sender: User;

  @Column({ type: 'text' })
  message: string;

  @Column('uuid', { nullable: true })
  breakoutRoomId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
