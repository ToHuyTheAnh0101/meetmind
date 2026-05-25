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
  id: string;

  @Column({ name: 'meeting_id', type: 'uuid', nullable: true })
  meetingId: string;

  @Column({ name: 'question_id', type: 'uuid', nullable: true })
  questionId: string;

  @ManyToOne(() => MeetingQuestion, (q) => q.answers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: MeetingQuestion;

  @Column({ name: 'answered_by_user_id', type: 'uuid', nullable: true })
  answeredByUserId: string; // Ai là người trả lời

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'answered_by_user_id' })
  answeredByUser: User;

  @ManyToOne(() => Participant)
  @JoinColumn([
    { name: 'meeting_id', referencedColumnName: 'meetingId' },
    { name: 'answered_by_user_id', referencedColumnName: 'userId' },
  ])
  answeredByParticipant: Participant;

  @Column('text')
  content: string; // Nội dung câu trả lời

  @CreateDateColumn()
  createdAt: Date;
}
