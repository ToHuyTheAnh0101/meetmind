import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { MeetingSession } from './meeting-session.entity';

@Entity('meeting_session_shares')
@Index(['sessionId', 'email'], { unique: true })
export class MeetingSessionShare {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  sessionId!: string;

  @ManyToOne(() => MeetingSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session!: MeetingSession;

  @Column()
  email!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
