import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../../users/user.entity';

import { MeetingQuestion } from './meeting-question.entity';
@Entity('meeting_answers')
export class MeetingAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  questionId: string;

  @ManyToOne(() => MeetingQuestion, (q) => q.answers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: MeetingQuestion;

  @Column('uuid')
  answeredByUserId: string; // Ai là người trả lời

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'answered_by_user_id' })
  answeredByUser: User;

  @Column('text')
  content: string; // Nội dung câu trả lời

  @CreateDateColumn()
  createdAt: Date;
}
