import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { Meeting } from '../core/meeting.entity';
import { MeetingSession } from '../core/meeting-session.entity';

@Entity('screen_captures')
@Index(['sessionId'])
export class ScreenCapture {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  meetingId!: string;

  @ManyToOne(() => Meeting, { onDelete: 'CASCADE' })
  meeting!: Meeting;

  @Column('uuid', { nullable: true })
  sessionId?: string;

  @ManyToOne(() => MeetingSession, { onDelete: 'CASCADE', nullable: true })
  session?: MeetingSession;

  @Column()
  imageUrl!: string;

  @Column('float')
  timestamp!: number; // seconds into meeting

  @CreateDateColumn()
  createdAt!: Date;
}
