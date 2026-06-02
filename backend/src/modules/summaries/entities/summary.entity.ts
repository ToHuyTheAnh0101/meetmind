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
  meeting?: Meeting;

  @Column('uuid', { nullable: true })
  meetingId?: string;

  @Column('uuid', { nullable: true })
  sessionId?: string;

  @OneToOne(() => MeetingSession, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn()
  session?: MeetingSession;

  @Column({ type: 'text', nullable: true })
  summaryText?: string;

  @Column('uuid', { nullable: true })
  templateId?: string;

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;
}
