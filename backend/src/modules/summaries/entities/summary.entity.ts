import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToOne,
  ManyToOne,
  Index,
} from 'typeorm';
import { Meeting, MeetingSession } from '../../meetings/entities';

@Entity('summaries')
@Index(['sessionId'])
export class Summary {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @ManyToOne(() => Meeting, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'meeting_id' })
  meeting?: Meeting;

  @Column('uuid', { nullable: true })
  meetingId?: string;

  @Column('uuid', { name: 'session_id', nullable: true })
  sessionId?: string;

  @OneToOne(() => MeetingSession, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'session_id' })
  session?: MeetingSession;

  @Column({ type: 'text', nullable: true })
  summaryText?: string;

  @Column('uuid', { name: 'template_id', nullable: true })
  templateId?: string;

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;
}
