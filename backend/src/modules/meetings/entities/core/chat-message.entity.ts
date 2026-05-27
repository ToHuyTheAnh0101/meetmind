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

  @Column('uuid', { name: 'session_id' })
  sessionId: string;

  @ManyToOne(() => MeetingSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: MeetingSession;

  @Column('uuid', { name: 'sender_user_id' })
  senderUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_user_id' })
  sender: User;

  @Column({ type: 'text' })
  message: string;

  @Column('uuid', { name: 'breakout_room_id', nullable: true })
  breakoutRoomId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
