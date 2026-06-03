import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';

import { MeetingQuestion } from './meeting-question.entity';
import { Participant } from '../../meetings/entities';
@Entity('meeting_answers')
export class MeetingAnswer {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @Column({ type: 'uuid', nullable: true })
  meetingId?: string;

  @Column({ type: 'uuid', nullable: true })
  questionId?: string;

  @ManyToOne(() => MeetingQuestion, (q) => q.answers, { onDelete: 'CASCADE' })
  question?: MeetingQuestion;

  @Column({ type: 'uuid', nullable: true })
  answeredByUserId?: string; // Ai là người trả lời

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  answeredByUser?: User;

  @ManyToOne(() => Participant)
  @JoinColumn([
    { name: 'meetingId', referencedColumnName: 'meetingId' },
    { name: 'answeredByUserId', referencedColumnName: 'userId' },
  ])
  answeredByParticipant?: Participant;

  @Column('text')
  content?: string; // Nội dung câu trả lời

  @CreateDateColumn()
  createdAt?: Date;
}
