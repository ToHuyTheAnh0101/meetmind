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
import { MeetingSession } from '../core/meeting-session.entity';

@Entity('transcript_chunks')
@Index(['sessionId'])
export class TranscriptChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  meetingId: string;

  @ManyToOne(() => Meeting, (meeting) => meeting.transcriptChunks, {
    onDelete: 'CASCADE',
  })
  meeting: Meeting;

  @Column('uuid', { nullable: true })
  sessionId?: string;

  @ManyToOne(() => MeetingSession, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'session_id' })
  session?: MeetingSession;

  @Column({ nullable: true })
  userId?: string;

  @Column({ nullable: true })
  speakerName?: string;

  @Column('text')
  content: string;

  @Column('vector', { length: 1536, nullable: true }) // 1536 là số chiều của OpenAI, tùy model bạn dùng
  embedding: number[];

  @Column({ nullable: true })
  chunkIndex: number;

  @Column({ nullable: true })
  startTime: number; // seconds into meeting

  @Column({ nullable: true })
  endTime: number; // seconds into meeting

  @CreateDateColumn()
  createdAt: Date;
}
