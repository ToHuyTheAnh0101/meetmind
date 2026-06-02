import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
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
  session!: MeetingSession;

  @Column()
  email!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
